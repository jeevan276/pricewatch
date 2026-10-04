import html
import os

import resend

from app.schemas.contact import ContactRequest


def _get_required_env(name: str) -> str:
    """Return a required environment variable or raise an error."""

    value = os.getenv(name)

    if not value:
        raise RuntimeError(
            f"Required environment variable '{name}' is not configured."
        )

    return value


def send_contact_email(contact: ContactRequest) -> None:
    """
    Send a contact form submission to the PriceWatch
    support email using Resend.
    """

    resend_api_key = _get_required_env("RESEND_API_KEY")
    support_email = _get_required_env("CONTACT_EMAIL")
    from_email = _get_required_env("CONTACT_FROM_EMAIL")

    # Configure Resend
    resend.api_key = resend_api_key

    # Escape user-provided content before inserting it into HTML.
    name = html.escape(contact.name)
    email = html.escape(str(contact.email))
    subject = html.escape(contact.subject)
    message = html.escape(contact.message).replace("\n", "<br>")

    params: resend.Emails.SendParams = {
        "from": from_email,
        "to": [support_email],
        "reply_to": str(contact.email),
        "subject": f"[PriceWatch Support] {contact.subject}",
        "html": f"""
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>PriceWatch Support</title>
                </head>

                <body
                    style="
                        margin: 0;
                        padding: 0;
                        background-color: #f8fafc;
                        font-family: Arial, Helvetica, sans-serif;
                    "
                >
                    <div
                        style="
                            max-width: 650px;
                            margin: 40px auto;
                            background-color: #ffffff;
                            border: 1px solid #e2e8f0;
                            border-radius: 12px;
                            overflow: hidden;
                        "
                    >
                        <!-- Header -->
                        <div
                            style="
                                padding: 24px;
                                background-color: #dc2626;
                                color: #ffffff;
                            "
                        >
                            <h1
                                style="
                                    margin: 0;
                                    font-size: 22px;
                                "
                            >
                                PriceWatch Support
                            </h1>

                            <p
                                style="
                                    margin: 6px 0 0;
                                    opacity: 0.9;
                                    font-size: 14px;
                                "
                            >
                                New contact form submission
                            </p>
                        </div>

                        <!-- Content -->
                        <div style="padding: 24px;">
                            <p
                                style="
                                    margin: 0 0 12px;
                                    color: #334155;
                                "
                            >
                                <strong>Name:</strong>
                                {name}
                            </p>

                            <p
                                style="
                                    margin: 0 0 12px;
                                    color: #334155;
                                "
                            >
                                <strong>Email:</strong>
                                {email}
                            </p>

                            <p
                                style="
                                    margin: 0 0 20px;
                                    color: #334155;
                                "
                            >
                                <strong>Subject:</strong>
                                {subject}
                            </p>

                            <!-- Message -->
                            <div
                                style="
                                    padding: 16px;
                                    background-color: #f8fafc;
                                    border-radius: 8px;
                                    line-height: 1.7;
                                    color: #334155;
                                "
                            >
                                <strong>Message</strong>

                                <p
                                    style="
                                        margin: 10px 0 0;
                                        white-space: normal;
                                    "
                                >
                                    {message}
                                </p>
                            </div>

                            <p
                                style="
                                    margin: 24px 0 0;
                                    color: #64748b;
                                    font-size: 13px;
                                    line-height: 1.6;
                                "
                            >
                                You can reply directly to this email to
                                respond to the user.
                            </p>
                        </div>

                        <!-- Footer -->
                        <div
                            style="
                                padding: 16px 24px;
                                background-color: #f8fafc;
                                border-top: 1px solid #e2e8f0;
                                color: #94a3b8;
                                font-size: 12px;
                            "
                        >
                            PriceWatch Support
                        </div>
                    </div>
                </body>
            </html>
        """,
    }

    # Resend's Python SDK provides send(), not send_async().
    resend.Emails.send(params)