import axiosInstance from "./axios.js";

export const registerUser=async(data)=>{
    const response =await axiosInstance.post("/auth/register",data);
    return response.data;
};

export const loginUser=async(data)=>{
    const response =await axiosInstance.post("/auth/login",data);
    return response.data;
};