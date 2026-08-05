import instance from "../../utils/axios.js";

const getCurrentUser = async() => {
    try {
        const { data } = await instance.get("/me");
        return data.user;   
    } catch (error) {
        console.error("Failed to fetch current user:", error);
        throw error;
    }
}

export default getCurrentUser;
