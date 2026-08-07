import proxy from "express-http-proxy";
 
export const proxyWithHeader = (serviceUrl) => {
    return proxy(serviceUrl, {
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            const userId = srcReq.user?._id || srcReq.user?.userId;

            if (userId) {
                proxyReqOpts.headers["x-user-id"] = userId.toString();
            }
            return proxyReqOpts;
        }
    });
};
