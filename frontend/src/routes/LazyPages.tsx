import { lazy } from "react";

export const Home = lazy(() => import("../pages/home"));
export const ProductDetails = lazy(() => import("../pages/productDetails"));
export const Products = lazy(() => import("../pages/products"));
export const ProductCompare = lazy(() => import("../pages/ProductCompare"));
export const PrivacyPolicy = lazy(() => import("../pages/PrivacyPolicy"));
export const TermsOfService = lazy(() => import("../pages/TermsOfService"));
export const ContactSupport = lazy(() => import("../pages/ContactSupport"));
export const ApiDocumentation = lazy(() => import("../pages/ApiDocumentation"));
