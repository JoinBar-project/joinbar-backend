export interface AiDescribeBarCommand {
  barId: string;
}

export interface AiDescribeBarResult {
  description: string;
}

export const AI_DESCRIBE_BAR_USE_CASE = 'AI_DESCRIBE_BAR_USE_CASE';

export interface AiDescribeBarUseCase {
  execute(command: AiDescribeBarCommand): Promise<AiDescribeBarResult>;
}
