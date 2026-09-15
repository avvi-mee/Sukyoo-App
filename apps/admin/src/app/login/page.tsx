import { Suspense } from 'react';
import { LoginForm } from './LoginForm';

// The form reads ?error= via useSearchParams, which forces a client bailout, so
// it needs its own Suspense boundary or the build refuses to prerender.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
