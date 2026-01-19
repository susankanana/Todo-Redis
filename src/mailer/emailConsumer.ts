import "dotenv/config";
import amqp from "amqplib";
import { sendEmail } from "./mailer";

const QUEUE_NAME = "email_queue";

export const startEmailConsumer = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
    const channel = await connection.createChannel();

    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log("Waiting for emails in queue...");

    channel.consume(QUEUE_NAME, async (msg) => {
      if (msg) {
        const emailData = JSON.parse(msg.content.toString());

        try {
          await sendEmail(
            emailData.to,
            emailData.subject,
            emailData.text,
            emailData.html
          );

          console.log("Email sent successfully to", emailData.to);

          channel.ack(msg); // confirm message processed and delete from queue
        } catch (error) {
          console.error("Error sending email:", error);
          channel.nack(msg, false, true); // retry later
        }
      }
    });
  } catch (error) {
    console.error("Failed to start email consumer:", error);
  }
};

startEmailConsumer();
