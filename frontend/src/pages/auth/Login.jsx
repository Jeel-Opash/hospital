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
    <main className="grid min-h-screen place-items-center  px-4">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl shadow-slate-200">
        <h1 className="text-3xl font-bold text-slate-950">Login</h1>
        <p className="mt-2 text-slate-600">Access your hospital portal.</p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <input className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            type="email" placeholder="Email" {...register("email", { required: true })}/>
          <input className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            type="password" placeholder="Password" {...register("password", { required: true })}/>
          <button
            className="w-full rounded-xl bg-teal-600 px-5 py-3 font-bold text-white hover:bg-teal-700"
            type="submit">
            Login
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          New here?{" "}
          <Link className="font-semibold text-teal-700" to="/register">
            Create account
          </Link>
        </p>
      </section>
    </main>
  );
};

export default Login;
