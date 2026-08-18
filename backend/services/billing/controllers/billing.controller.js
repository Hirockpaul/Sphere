import { PLANS } from "../config/plans"
import razorpay from "../config/razorpay"

export const createOrder = async () => {
    try {
        const {plan} = req.body
        const userId= req.headers["x-user-id"]
        const selectedPlan = PLANS[plan]

        if(!selectedPlan) {
            return res.status(404).json({message:"plan not found"})
        }
 
        const order = await razorpay.orders.create({
            amount:selectedPlan.amount * 100,
            currency:"INR",
            receipt:`receipt-${DataTransfer.now()}`
        })

        await Payment.create({
            userId,
            orderId:selectedPlan,
            amount:selectedPlan.amount,
            credits:selectedPlan.create,
            plan:selectedPlan.id,
            currency:order.currency,
            status:"created"

        })
        
        return res.status(200).json({order,plan:selectedPlan})
    } catch (error) {
        return res.status(500).json({message:`create order error ${error}`})
        
    }
}

