import { Injectable, Logger } from "@nestjs/common";

const DEFAULT_SETTINGS_URL = "http://localhost:4381";

export type UserContextResponse = {
  name: string;
  bio: string;
  goals: string;
  struggles: string;
};

@Injectable()
export class SettingsClient {
  private readonly logger = new Logger(SettingsClient.name);
  private readonly baseUrl: string;
  private readonly serviceToken: string;

  constructor() {
    this.baseUrl = (process.env.SETTINGS_SERVICE_URL ?? DEFAULT_SETTINGS_URL).replace(/\/$/, "");
    this.serviceToken = process.env.GATEWAY_SERVICE_TOKEN ?? "";
  }

  async getUserContext(userId: string): Promise<UserContextResponse | null> {
    if (!this.serviceToken) {
      this.logger.warn("GATEWAY_SERVICE_TOKEN missing; skipping settings profile context");
      return null;
    }
    try {
      const res = await fetch(`${this.baseUrl}/profile/context`, {
        headers: {
          "x-service-token": this.serviceToken,
          "x-user-id": userId,
        },
      });
      if (!res.ok) {
        this.logger.warn(`settings GET /profile/context failed: ${res.status}`);
        return null;
      }
      return (await res.json()) as UserContextResponse;
    } catch (err) {
      this.logger.warn(`settings GET /profile/context error: ${String(err)}`);
      return null;
    }
  }
}
