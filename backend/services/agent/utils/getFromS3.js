import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3 } from "../config/s3.js";

export const getFromS3 = (filename, expiresIn = 24 * 60 * 60) => getSignedUrl(
  getS3(),
  new GetObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: filename }),
  { expiresIn },
);
