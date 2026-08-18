import proxy from "express-http-proxy";
 
export const proxyWithHeader = (serviceUrl, { forwardSession = false } = {}) => {
    return proxy(serviceUrl, {
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            const userId = srcReq.user?._id || srcReq.user?.userId;

            if (userId) {
                proxyReqOpts.headers["x-user-id"] = userId.toString();
            }
            if (forwardSession && srcReq.cookies?.sessionId) {
                proxyReqOpts.headers["x-session-id"] = srcReq.cookies.sessionId;
            }
            return proxyReqOpts;
        }
    });
};
