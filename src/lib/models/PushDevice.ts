import mongoose, { Schema, Document } from "mongoose";

// A single device registered to receive native push notifications. One user
// can have several (phone, iPad), and one physical device maps to one APNs
// token - so the token is the unique key: re-registering the same device
// upserts rather than duplicating. Dead tokens (app uninstalled, wrong
// environment) are deleted by the sender when APNs reports them invalid.
export interface IPushDevice extends Document {
  userId: mongoose.Types.ObjectId;
  // The APNs device token (hex string). Unique across the collection.
  token: string;
  platform: "ios";
  // "sandbox" for development builds, "production" for App Store / TestFlight.
  // A token is only valid against the matching APNs host, so we store it to
  // route each send to the right environment.
  environment: "sandbox" | "production";
  // The app bundle id / APNs topic the token was registered under.
  bundleId: string;
  createdAt: Date;
  lastSeenAt: Date;
}

const PushDeviceSchema = new Schema<IPushDevice>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  token: { type: String, required: true, unique: true },
  platform: { type: String, enum: ["ios"], default: "ios" },
  environment: {
    type: String,
    enum: ["sandbox", "production"],
    default: "production",
  },
  bundleId: { type: String, default: "com.cuequill.app" },
  createdAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
});

if (process.env.NODE_ENV !== "production" && mongoose.models.PushDevice) {
  mongoose.deleteModel("PushDevice");
}

export const PushDevice =
  mongoose.models.PushDevice ||
  mongoose.model<IPushDevice>("PushDevice", PushDeviceSchema);
