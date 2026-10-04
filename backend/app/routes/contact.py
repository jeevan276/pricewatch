from fastapi import APIRouter, HTTPException, status
from fastapi.concurrency import run_in_threadpool

from app.schemas.contact import ContactRequest, ContactResponse
from app.services.contact import send_contact_email


router = APIRouter(
    prefix="/api/contact",
    tags=["Contact"],
)


@router.post(
    "",
    response_model=ContactResponse,
    status_code=status.HTTP_200_OK,
)
async def contact_support(
    contact: ContactRequest,
):
    """
    Receive a support message and send it to the
    PriceWatch support email.
    """

    try:
        await run_in_threadpool(send_contact_email, contact)

    except RuntimeError as exc:
        print(f"Contact configuration error: {exc}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Contact service is not configured correctly.",
        ) from exc

    except Exception as exc:
        print(f"Contact email error: {exc}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to send your message. Please try again later.",
        ) from exc

    return {
        "message": "Your message has been sent successfully.",
    }