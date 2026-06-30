import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Switch, Route, Redirect } from "wouter";
import { Toaster } from "sonner";
import { isAuthenticated } from "@/lib/auth";
import LoginPage from "@/app/login/page";
import OrdersClient from "@/app/orders/OrdersClient";
import FinanceClient from "@/app/finance/FinanceClient";
import ReportsClient from "@/app/reports/ReportsClient";
import CatalogClient from "@/app/catalog/CatalogClient";
import SnippetsClient from "@/app/snippets/SnippetsClient";
import DashboardRedirect from "@/app/page";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  // قراءة localStorage مباشرة (synchronous) لتفادي وميض الشاشة الفارغة
  const [authed, setAuthed] = useState(() => isAuthenticated());

  if (!authed) {
    return <LoginPage onSuccess={() => setAuthed(true)} />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard>
        <Switch>
          <Route path="/" component={DashboardRedirect} />
          <Route path="/orders" component={OrdersClient} />
          <Route path="/finance" component={FinanceClient} />
          <Route path="/reports" component={ReportsClient} />
          <Route path="/catalog" component={CatalogClient} />
          <Route path="/snippets" component={SnippetsClient} />
          <Route><Redirect to="/" /></Route>
        </Switch>
      </AuthGuard>
      <Toaster position="top-center" richColors dir="rtl" />
    </QueryClientProvider>
  );
}
