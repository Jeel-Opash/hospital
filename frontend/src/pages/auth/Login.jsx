import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../../api/authApi";
import { useAuth } from "../../context/AuthContext.jsx";

const Login = () => {
  const { register, handleSubmit } = useForm();
  const { login } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      const response = await loginUser(data);
      login(response.data);
      toast.success("Login Successful");
      const role = response.data.user.role;

      if (role === "Patient") navigate("/patient");
      else if (role === "Doctor") navigate("/doctor");
      else if (role === "Clinic Admin") navigate("/admin");
      else navigate("/login");
    } catch (error) {
      toast.error(error.response?.data?.message || "Login Failed");
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <h1>Login</h1>
        <p>Access your hospital portal.</p>

        <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
          <input type="email" placeholder="Email" {...register("email", { required: true })}/>
          <input type="password" placeholder="Password" {...register("password", { required: true })}/>
          <button className="button button-primary" type="submit">
            Login
          </button>
        </form>

        <p className="auth-link">
          New here?{" "}
          <Link to="/register">
            Create account
          </Link>
        </p>
      </section>
    </main>
  );
};

export default Login;
