import amqp from "amqplib";

// The queue name
const QUEUE_NAME = "email_queue";

// Connect to RabbitMQ and send a message
export const enqueueEmail = async (emailData: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
    const channel = await connection.createChannel();

    await channel.assertQueue(QUEUE_NAME, { durable: true });

    channel.sendToQueue(
      QUEUE_NAME,
      Buffer.from(JSON.stringify(emailData)),
      { persistent: true } // ensures message survives RabbitMQ restart
    );

    console.log("Email enqueued:", emailData);

    await channel.close();
    await connection.close();
  } catch (error) {
    console.error("Failed to enqueue email:", error);
  }
};
