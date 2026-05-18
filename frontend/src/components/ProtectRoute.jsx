import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const ProtectRoute =({children,role})=>{
    const {user}=useAuth();
    if(!user){
        return <Navigate to="/login"/>;
        }
        if (role && user.role !== role) {
    return <Navigate to="/login" />;
  } 
  return children;
}
export default ProtectRoute;
