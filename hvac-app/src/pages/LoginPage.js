function LoginPage() {
  const loginWithGoogle = () => {
    const currentUrl = window.location.href; // the page user is currently on
    window.location.href = `http://localhost:4000/auth/google?redirect=${encodeURIComponent(currentUrl)}`;

  };

  return (
    <div>
      <h2>Sign in</h2>
      <button onClick={loginWithGoogle}>
        Sign in with Google
      </button>
    </div>
  );
}

export default LoginPage;
