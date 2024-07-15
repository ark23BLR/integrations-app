import { Field, Int, ObjectType } from "type-graphql";

@ObjectType({ description: "Webhook configuration" })
class WebhookConfig {
  @Field(() => String, {
    description: "Webhook configuration url",
    nullable: true,
  })
  url?: string | null;

  @Field({ description: "Webhook configuration content type", nullable: true })
  content_type?: string | null;

  @Field(() => String, {
    description: "Webhook configuration secret",
    nullable: true,
  })
  secret?: string | null;

  @Field(() => String, { description: "Webhook insecure ssl", nullable: true })
  insecure_ssl?: string | null;
}

@ObjectType({ description: "Last Webhook response" })
class LastWebhookResponse {
  @Field(() => Int, {
    description: "Last webhook response status code",
    nullable: true,
  })
  code?: number | null;

  @Field({ description: "Last webhook response status", nullable: true })
  status?: string | null;

  @Field({ description: "Last webhook response message", nullable: true })
  message?: string | null;
}

@ObjectType({ description: "Webhook" })
export class Webhook {
  @Field(() => Int, { description: "Webhook id" })
  id!: number;

  @Field({ description: "Webhook name" })
  name!: string;
  @Field(() => Boolean, {
    description: "Flag, which indicates if webhook is active",
  })
  active!: boolean;

  @Field({ description: "Type of the webhook" })
  type!: string;

  @Field(() => [String], { description: "Webhook events" })
  events!: string[];

  @Field(() => WebhookConfig, { description: "Webhook configuration" })
  config!: WebhookConfig;

  @Field({ description: "Timestamp, which indicates when webhook was updated" })
  updated_at!: string;

  @Field({ description: "Timestamp, which indicates when webhook was created" })
  created_at!: string;

  @Field({ description: "Webhook url" })
  url!: string;

  @Field({ description: "Webhook test url" })
  test_url!: string;

  @Field({ description: "Webhook ping url" })
  ping_url!: string;

  @Field(() => String, {
    description: "Webhook deliveries url",
    nullable: true,
  })
  deliveries_url?: string | null;

  @Field(() => LastWebhookResponse, { description: "Last webhook response" })
  last_response!: LastWebhookResponse;
}
