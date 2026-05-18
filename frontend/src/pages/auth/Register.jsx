import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../../api/authApi";


const Register = () => {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      role: "Patient",
    },
  });
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      await registerUser(data);
      toast.success("Registration Successful");
      navigate("/login");
    } catch (error) {
      toast.error(error.response?.data?.message || "Error");
    }
  };

  return (
    <main className="grid min-h-screen place-items-center  px-4">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl shadow-slate-200">
        <h1 className="text-3xl font-bold text-slate-950">Register</h1>
        <p className="mt-2 text-slate-600">Create your hospital account.</p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <input
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            type="text"
            placeholder="Username"
            {...register("username", { required: true })}
          />
          <input
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            type="email"
            placeholder="Email"
            {...register("email", { required: true })}
          />
          <input
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            type="password"
            placeholder="Password"
            {...register("password", { required: true, minLength: 6 })}
          />
          <select
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            {...register("role")}
          >
            <option value="Patient">Patient</option>
            <option value="Doctor">Doctor</option>
            <option value="Clinic Admin">Clinic Admin</option>
          </select>
          <button
            className="w-full rounded-xl bg-teal-600 px-5 py-3 font-bold text-white hover:bg-teal-700"
            type="submit"
          >
            Register
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already registered?{" "}
          <Link className="font-semibold text-teal-700" to="/login">
            Login
          </Link>
        </p>
      </section>
    </main>
  );
}

export default Register
