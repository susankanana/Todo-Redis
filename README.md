Using Redis in the Project

This project leverages Redis to enhance performance, security, and user experience. Redis is used for sessions, email verification, rate limiting, resend cooldowns, and caching for Todo resources.

1. Setting up Redis

Install the Redis client:

pnpm add ioredis


Create a src/redis/client.ts to manage the Redis connection:

import Redis from "ioredis";

const redisClient = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on("connect", () => console.log("Redis connected"));
redisClient.on("error", (err) => console.error("Redis error", err));

export default redisClient;

2. Redis for Authentication
2.1 Sessions

auth.redis.ts handles login sessions:

saveSession(userId, token) – stores the JWT in Redis with a 1-hour expiry.

verifySession(userId, token) – checks if the token is still valid in Redis.

deleteSession(userId) – removes the session when the user logs out.

await redisClient.set(`session:${userId}`, token, "EX", 3600);


This decouples authentication from the database and allows single sign-out and session expiration.

2.2 Email Verification

Verification codes are stored temporarily in Redis (no DB column).

TTL = 10 minutes.

await redisClient.set(`verify:${email}`, code, "EX", 600);


Controllers and services delegate verification logic to Redis:

saveVerificationCode(email, code) → stores code and applies resend cooldown.

verifyEmailCodeService(email, code) → validates code and resets rate counters.

2.3 Rate Limiting Verification Attempts

Prevent brute-force verification attempts.

Implementation (src/auth/verification.rate.ts):

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 600; // 10 minutes

export const incrementVerificationAttempts = async (email: string) => {
  const key = `verify_attempts:${email}`;
  const attempts = await redisClient.incr(key);
  if (attempts === 1) await redisClient.expire(key, WINDOW_SECONDS);
  return attempts;
};

export const isVerificationBlocked = async (email: string) => {
  const attempts = Number(await redisClient.get(`verify_attempts:${email}`));
  return attempts >= MAX_ATTEMPTS;
};

export const resetVerificationAttempts = async (email: string) => {
  await redisClient.del(`verify_attempts:${email}`);
};


Limits verification attempts to 5 per 10 minutes.

Blocks users temporarily if exceeded.

2.4 Resend Verification with Cooldown

Prevents users from spamming the resend code button.

Implementation (src/auth/verification.cooldown.ts):

const COOLDOWN_SECONDS = 60;

export const canResendVerification = async (email: string) => {
  const exists = await redisClient.exists(`verify_cooldown:${email}`);
  return !exists;
};

export const setResendCooldown = async (email: string) => {
  await redisClient.set(`verify_cooldown:${email}`, "1", "EX", COOLDOWN_SECONDS);
};


Cooldown = 60 seconds between resends.

Integrated in saveVerificationCode in auth.service.ts.

3. Redis in Middleware (checkRoles)

checkRoles middleware validates JWT and checks session in Redis.

const validSession = await verifySession(decoded.id, token);
if (!validSession) return res.status(401).json({ message: "Session expired or invalid" });


Stores decoded JWT payload in req.user for downstream controllers.

4. Redis for Todo Caching

Improves performance for fetching todos.

Workflow:

Try fetching todos from Redis.

If cache miss, query PostgreSQL and set cache for 5 minutes.

Any create/update/delete operation invalidates the cache automatically.

const cached = await redisClient.get("todos:all");
if (cached) return JSON.parse(cached);

const todos = await db.query.TodoTable.findMany();
await redisClient.set("todos:all", JSON.stringify(todos), "EX", 300);


Centralized caching prevents duplicating Redis logic in multiple services.

5. Summary of Redis Usage
Feature	Redis Key Pattern	TTL	Purpose
Login Session	session:<userId>	1 hour	JWT session storage for login/logout
Email Verification Code	verify:<email>	10 minutes	Temporary verification codes
Verification Attempts	verify_attempts:<email>	10 minutes	Rate-limiting verification attempts
Resend Cooldown	verify_cooldown:<email>	60 seconds	Prevent spamming resend code
Todo Cache	todos:all	5 minutes	Reduce database queries for fetching all todos
✅ Benefits of Using Redis

Fast: In-memory storage for quick lookups.

Temporary Storage: Perfect for verification codes and sessions.

Rate Limiting & Cooldowns: Protects against abuse.

Cache for DB Queries: Reduces load on PostgreSQL.

Decoupling: Sessions and verification logic don’t require changes to DB schema.



Using RabbitMQ in the Project

This project leverages RabbitMQ to handle email sending asynchronously, improving performance and user experience. Instead of sending emails directly from controllers (which blocks the request), we enqueue email jobs in RabbitMQ, which are then processed by a separate consumer/worker process.

1. Install Dependencies
pnpm add amqplib
pnpm add -D @types/amqplib


amqplib is the standard RabbitMQ client for Node.js.

Types package provides TypeScript support.

2. Configure RabbitMQ

Add your RabbitMQ URL to the .env file:

# RabbitMQ
RABBITMQ_URL=amqp://username:password@localhost:5672/


Replace username and password with your RabbitMQ credentials.

Default RabbitMQ user is guest/guest.

3. Producer: Enqueue Emails

Create src/mailer/emailProducer.ts to publish email jobs to the queue:

import amqp from "amqplib";

const QUEUE_NAME = "email_queue";

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
      { persistent: true } // survives RabbitMQ restart
    );

    console.log("Email enqueued:", emailData);

    await channel.close();
    await connection.close();
  } catch (error) {
    console.error("Failed to enqueue email:", error);
  }
};


Key Points:

Messages are stored in RabbitMQ and not sent directly.

persistent: true ensures durability in case RabbitMQ restarts.

4. Consumer: Send Emails

Create src/mailer/emailConsumer.ts to process the queue:

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
          await sendEmail(emailData.to, emailData.subject, emailData.text, emailData.html);
          console.log("Email sent successfully to", emailData.to);
          channel.ack(msg); // confirm message processed
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


Important Notes:

Run the consumer separately from the server.

Command:

pnpm run build
node dist/mailer/emailConsumer.js

5. Controller Integration

Replace direct calls to sendEmail(...) with enqueueEmail(...) in your controllers:

import { enqueueEmail } from "../../src/mailer/emailProducer";

enqueueEmail({
  to: user.email,
  subject: "Verify your account",
  text: `Hello ${user.lastName}, your verification code is: ${verificationCode}`,
  html: `
    <div>
      <h2>Hello ${user.lastName},</h2>
      <p>Your verification code is <strong>${verificationCode}</strong></p>
      <p>This code expires in 10 minutes.</p>
    </div>
  `,
});


No await needed.

Controller returns immediately; email sending is asynchronous.

6. RabbitMQ Management UI

Enable the management plugin (rabbitmq-plugins enable rabbitmq_management).

Open: http://localhost:15672

Login: guest / guest

Go to Queues tab and check your queue:

Status	Meaning
Messages Ready	In queue, not yet processed
Messages Unacknowledged	Currently being processed

If messages remain in “Ready,” the consumer is not running.

Once the consumer runs, messages are processed, and the queue is cleared.

7. Multiple Queues and Workers

You can use RabbitMQ for other tasks, like payment processing:

src/
 ├── queues/
 │    ├── email.producer.ts
 │    ├── payment.producer.ts
 ├── workers/
 │    ├── email.worker.ts
 │    ├── payment.worker.ts
 ├── mailer/
 │    └── sendEmail.ts
 └── payments/
      └── processPayment.ts


Each worker listens to its own queue.

Queues can scale independently.

Example Queues:

Queue Name	Worker
email_queue	email.worker.ts
payment_queue	payment.worker.ts
sms_queue	sms.worker.ts
Summary

Controllers → enqueue jobs.

RabbitMQ → stores messages reliably.

Workers/Consumers → process messages asynchronously.

✅ Benefits:

Controllers are faster.

Email sending does not block user flows.

Queues are reliable and scalable.

Can easily add workers for other tasks (payments, SMS, etc.).