import { S3Client } from "@aws-sdk/client-s3";
import { SQSClient } from "@aws-sdk/client-sqs";
import { IConvictProps } from "../../../config/IConvictProps";

export type AwsClients = {
  sqsClient: SQSClient;
  s3Client: S3Client;
};

// Único lugar que arma los clientes del SDK. Con endpoint, hablan con LocalStack; sin él, con
// AWS real. Las credenciales no se pasan: el SDK las toma de su cadena estándar (variables de
// entorno en local, el rol de la máquina en AWS).
export function createAwsClients(aws: IConvictProps["aws"]): AwsClients {
  if (aws.endpoint === "") {
    return {
      sqsClient: new SQSClient({ region: aws.region }),
      s3Client: new S3Client({ region: aws.region }),
    };
  }
  return {
    sqsClient: new SQSClient({ region: aws.region, endpoint: aws.endpoint }),
    // Path style: http://localhost:4566/<bucket>/<clave>, sin depender de DNS con el nombre del bucket
    s3Client: new S3Client({ region: aws.region, endpoint: aws.endpoint, forcePathStyle: true }),
  };
}
