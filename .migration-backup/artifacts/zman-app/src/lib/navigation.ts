import { useLocation, useSearch, Link as WouterLink } from "wouter";

export function useRouter() {
  const [, navigate] = useLocation();
  return {
    push: (url: string) => navigate(url),
    replace: (url: string) => navigate(url, { replace: true }),
    refresh: () => window.location.reload(),
  };
}

export function usePathname() {
  const [pathname] = useLocation();
  return pathname;
}

export function useSearchParams() {
  const search = useSearch();
  return new URLSearchParams(search);
}

export { WouterLink as Link };
