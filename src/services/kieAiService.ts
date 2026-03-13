/**
 * Kie AI Video Generation Service
 */

const KIE_AI_API_KEY =
  import.meta.env.VITE_KIE_AI_API_KEY || "2de3b420a72cbbc1ac39103f225440c8";
const KIE_AI_BASE_URL = "https://api.kie.ai/api/v1";

const AVAILABLE_VIDEO_MODELS = {
  "sora-2": "sora-2-text-to-video",
  "kling-3.0": "kling-3.0/video",
  "kling-2.6": "kling-2.6/text-to-video",
  "seedance-1.5-pro": "bytedance/seedance-1-5-pro",
  "grok-imagine": "grok-imagine/video",
};

export interface KieVideoOptions {
  prompt: string;
  aspectRatio?: "landscape" | "portrait" ;
  duration?: number; // seconds (3-15)
  model?: keyof typeof AVAILABLE_VIDEO_MODELS;
  mode?: "std" | "pro"; // generation quality mode
  sound?: boolean; // enable sound effects
}

export interface KieVideoResponse {
  success: boolean;
  videoUrl?: string;
  taskId?: string;
  error?: string;
  status?: "pending" | "processing" | "completed" | "failed";
}

/**
 * Generate video using Kie AI
 */
export async function generateVideoWithKieAI(
  prompt: string,
  options: Partial<KieVideoOptions> = {},
  onProgress?: (message: string) => void,
): Promise<string> {
  try {
    const {
      aspectRatio = "landscape",
      duration = 10,
      model = "sora-2",
      mode = "std",
      sound = true,
    } = options;

    onProgress?.("🎬 Initializing Kie AI video generation...");

    // Step 1: Submit video generation request
    const response = await fetch(`${KIE_AI_BASE_URL}/jobs/createTask`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KIE_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AVAILABLE_VIDEO_MODELS[model],
        input: {
          prompt: prompt,
          aspect_ratio: aspectRatio,
          duration: duration.toString(), // Convert to string as required by API
          mode: mode,
          sound: sound,
          multi_shots: false,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Kie AI request failed: ${response.status} - ${errorData.msg || errorData.message || "Unknown error"}`,
      );
    }

    const data = await response.json();

    if (data.code !== 200 || !data.data?.taskId) {
      throw new Error(
        `Kie AI generation failed: ${data.msg || "No task ID received"}`,
      );
    }

    const taskId = data.data.taskId;
    onProgress?.(
      `🔄 Video generation started (Task ID: ${taskId}). This may take 1-3 minutes`,
    );

    // Step 2: Poll for completion
    return await pollVideoGeneration(taskId, onProgress);
  } catch (error) {
    console.error("Kie AI video generation error:", error);
    throw error instanceof Error ? error : new Error("Unknown error occurred");
  }
}

/**
 * Poll for video generation completion
 */
async function pollVideoGeneration(
  taskId: string,
  onProgress?: (message: string) => void,
): Promise<string> {
  const maxAttempts = 30; // 2.5 minutes max (5s intervals)
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(
        `${KIE_AI_BASE_URL}/jobs/recordInfo?taskId=${taskId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${KIE_AI_API_KEY}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.code !== 200) {
        throw new Error(`API error: ${result.msg || "Unknown error"}`);
      }

      const taskData = result.data;

      switch (taskData.state) {
        case "success":
          if (taskData.resultJson) {
            const resultData = JSON.parse(taskData.resultJson);
            if (resultData.resultUrls && resultData.resultUrls.length > 0) {
              onProgress?.("✅ Video generation completed!");
              return resultData.resultUrls[0];
            }
          }
          throw new Error("Video completed but no URL found in results");

        case "fail":
          throw new Error(
            `Video generation failed: ${taskData.failMsg || "Unknown error"}`,
          );

        case "generating":
          const progressPercent = Math.round((attempts / maxAttempts) * 100);
          onProgress?.(
            `🎬 Processing video... (${progressPercent}% estimated)`,
          );
          break;

        case "queuing":
        case "waiting":
          onProgress?.("⏳ Video queued for processing...");
          break;

        default:
          onProgress?.("🔄 Checking status...");
      }
    } catch (error) {
      console.error(`Polling attempt ${attempts + 1} failed:`, error);
      if (attempts === maxAttempts - 1) {
        throw new Error("Failed to check video generation status");
      }
    }

    // Wait 5 seconds before next check
    await new Promise((resolve) => setTimeout(resolve, 5000));
    attempts++;
  }

  throw new Error("Video generation timed out after 2.5 minutes");
}

/**
 * Test Kie AI service connectivity
 */
export async function testKieAIService(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    // Test by checking credit balance
    const response = await fetch(`${KIE_AI_BASE_URL}/chat/credit`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${KIE_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.code === 200) {
        return {
          success: true,
          message: `Kie AI service connected. Credits: ${data.data}`,
          details: { credits: data.data },
        };
      } else {
        return {
          success: false,
          message: `API responded with error: ${data.msg || "Unknown error"}`,
        };
      }
    } else {
      return {
        success: false,
        message: `Service unavailable: ${response.status} ${response.statusText}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Get available video models from Kie AI
 */
export async function getAvailableVideoModels(): Promise<string[]> {
  // Return available video models based on API documentation
  return Object.keys(AVAILABLE_VIDEO_MODELS);
}

/**
 * Check current credit balance
 */
export async function getKieAICredits(): Promise<{
  success: boolean;
  credits?: number;
  message: string;
}> {
  try {
    const response = await fetch(`${KIE_AI_BASE_URL}/chat/credit`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${KIE_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.code === 200) {
        return {
          success: true,
          credits: data.data,
          message: `${data.data} credits remaining`,
        };
      } else {
        return {
          success: false,
          message: data.msg || "Failed to get credits",
        };
      }
    } else {
      return {
        success: false,
        message: `Failed to check credits: ${response.status} ${response.statusText}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Error checking credits: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
