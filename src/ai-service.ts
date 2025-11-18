import OpenAI from "openai";

export interface AIConfig {
  apiKey?: string;
  model?: string;
  enabled: boolean;
}

export class AIService {
  private client: OpenAI | null = null;
  private model: string;

  constructor(config: AIConfig) {
    if (config.enabled && config.apiKey) {
      this.client = new OpenAI({
        apiKey: config.apiKey,
      });
      this.model = config.model || "gpt-3.5-turbo";
    } else {
      this.client = null;
      this.model = "gpt-3.5-turbo";
    }
  }

  /**
   * Generates a description for a function using AI
   * @param functionName - The name of the function
   * @param parameters - Array of parameter information
   * @param returnType - The return type of the function
   * @param functionCode - The actual function code for context
   * @returns A meaningful description or a fallback description
   */
  async generateDescription(
    functionName: string,
    parameters: { name: string; type: string }[],
    returnType: string,
    functionCode: string
  ): Promise<string> {
    if (!this.client) {
      return `Press Your { Function ${functionName} } Description`;
    }

    try {
      const prompt = this.buildPrompt(
        functionName,
        parameters,
        returnType,
        functionCode
      );

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that generates concise JSDoc descriptions for functions. Provide only the description text without any markdown formatting, code blocks, or JSDoc syntax. Keep it brief and professional.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 150,
      });

      const description = response.choices[0]?.message?.content?.trim();
      return description || `Press Your { Function ${functionName} } Description`;
    } catch (error) {
      console.warn(
        `Warning: Failed to generate AI description for ${functionName}:`,
        error instanceof Error ? error.message : "Unknown error"
      );
      return `Press Your { Function ${functionName} } Description`;
    }
  }

  private buildPrompt(
    functionName: string,
    parameters: { name: string; type: string }[],
    returnType: string,
    functionCode: string
  ): string {
    const paramList =
      parameters.length > 0
        ? parameters
            .map((p) => `${p.name}: ${p.type}`)
            .join(", ")
        : "none";

    return `Generate a concise JSDoc description for the following function:

Function Name: ${functionName}
Parameters: ${paramList}
Return Type: ${returnType}

Function Code:
${functionCode}

Provide only the description text (one or two sentences) without any additional formatting.`;
  }

  /**
   * Checks if AI is enabled and configured
   */
  isEnabled(): boolean {
    return this.client !== null;
  }
}
