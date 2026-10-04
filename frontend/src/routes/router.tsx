import { Home, ProductDetails, Products, ProductCompare, PrivacyPolicy, TermsOfService, ContactSupport, ApiDocumentation } from "./LazyPages";
import { Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";

import NotFound from "../pages/NotFound";





import SignIn from "../pages/SignIn";
import SignUp from "../pages/SignUp";

import ProtectedRoute from "./ProtectedRoute";





export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Suspense fallback={<p className="p-8 text-muted-foreground" role="status">Loading…</p>}><Home /></Suspense>,
      },

      {
        path: "products",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<p className="p-8 text-muted-foreground" role="status">Loading…</p>}><Products /></Suspense>
          </ProtectedRoute>
        ),
      },

      {
        path: "product/:id",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<p className="p-8 text-muted-foreground" role="status">Loading…</p>}><ProductDetails /></Suspense>
          </ProtectedRoute>
        ),
      },

      {
        path: "compare",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<p className="p-8 text-muted-foreground" role="status">Loading…</p>}><ProductCompare /></Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: "privacy",
        element: <Suspense fallback={<p className="p-8 text-muted-foreground" role="status">Loading…</p>}><PrivacyPolicy /></Suspense>,
      },
      { 
        path: "terms",
        element: <Suspense fallback={<p className="p-8 text-muted-foreground" role="status">Loading…</p>}><TermsOfService /></Suspense>,
      },
      {
        path: "contact",
        element: <Suspense fallback={<p className="p-8 text-muted-foreground" role="status">Loading…</p>}><ContactSupport /></Suspense>,
      },
      {
        path: "api-docs",
        element: (
          <ProtectedRoute>
            <Suspense fallback={<p className="p-8 text-muted-foreground" role="status">Loading…</p>}><ApiDocumentation /></Suspense>
          </ProtectedRoute>
        ),
      }
    ],
  },

  {
    path: "/signin",
    element: <SignIn />,
  },

  {
    path: "/signup",
    element: <SignUp />,
  },

  {
    path: "*",
    element: <NotFound />,
  },
]);