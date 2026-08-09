import api from '../../utils/axios'

async function logOut () {
    try {
        const {data} =api.get("/api/auth/logout")
        console.log(data)
    } catch (error) {
      console.log(error)
    }
    
}
export default logOut
