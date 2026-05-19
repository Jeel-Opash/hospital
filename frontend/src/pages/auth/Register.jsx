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
    <main className="auth-shell">
      <section className="auth-panel">
        <h1>Register</h1>
        <p>Create your hospital account.</p>

        <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
          <input
            type="text"
            placeholder="Username"
            {...register("username", { required: true })}
          />
          <input
            type="email"
            placeholder="Email"
            {...register("email", { required: true })}
          />
          <input
            type="password"
            placeholder="Password"
            {...register("password", { required: true, minLength: 6 })}
          />
          <select
            {...register("role")}
          >
            <option value="Patient">Patient</option>
            <option value="Doctor">Doctor</option>
            <option value="Clinic Admin">Clinic Admin</option>
          </select>
          <button
            className="button button-primary"
            type="submit"
          >
            Register
          </button>
        </form>

        <p className="auth-link">
          Already registered?{" "}
          <Link to="/login">
            Login
          </Link>
        </p>
      </section>
    </main>
  );
}

export default Register
