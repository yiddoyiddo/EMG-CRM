'use client';

import { toast } from 'sonner';

// Error types for better categorization
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN',
}

// Standard error interface
export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: Error;
  statusCode?: number;
  context?: string;
}

// Error classification function
export function classifyError(error: unknown, context?: string): AppError {
  if (error instanceof Response) {
    return {
      type: getErrorTypeFromStatus(error.status),
      message: getErrorMessageFromStatus(error.status),
      statusCode: error.status,
      context,
    };
  }

  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        type: ErrorType.NETWORK,
        message: 'Network connection failed. Please check your internet connection.',
        originalError: error,
        context,
      };
    }

    // Validation errors (assuming they contain certain keywords)
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return {
        type: ErrorType.VALIDATION,
        message: error.message,
        originalError: error,
        context,
      };
    }

    return {
      type: ErrorType.UNKNOWN,
      message: error.message,
      originalError: error,
      context,
    };
  }

  return {
    type: ErrorType.UNKNOWN,
    message: 'An unexpected error occurred',
    context,
  };
}

// Get error type from HTTP status code
function getErrorTypeFromStatus(status: number): ErrorType {
  if (status >= 400 && status < 500) {
    switch (status) {
      case 401:
      case 403:
        return ErrorType.AUTHORIZATION;
      case 404:
        return ErrorType.NOT_FOUND;
      case 422:
        return ErrorType.VALIDATION;
      default:
        return ErrorType.VALIDATION;
    }
  }

  if (status >= 500) {
    return ErrorType.SERVER;
  }

  return ErrorType.UNKNOWN;
}

// Get user-friendly error message from HTTP status code
function getErrorMessageFromStatus(status: number): string {
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input.';
    case 401:
      return 'You are not authorized to perform this action.';
    case 403:
      return 'Access denied. You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 422:
      return 'Validation failed. Please check your input.';
    case 429:
      return 'Too many requests. Please try again later.';
    case 500:
      return 'Internal server error. Please try again later.';
    case 502:
      return 'Bad gateway. The server is temporarily unavailable.';
    case 503:
      return 'Service unavailable. Please try again later.';
    default:
      return 'An error occurred. Please try again.';
  }
}

// Error handling functions
export function handleApiError(error: unknown, context?: string): AppError {
  const appError = classifyError(error, context);
  
  // Log error for debugging
  console.error(`[${context || 'API'}] Error:`, {
    type: appError.type,
    message: appError.message,
    statusCode: appError.statusCode,
    originalError: appError.originalError,
  });

  return appError;
}

// Show error toast with appropriate styling
export function showErrorToast(error: AppError): void {
  const { type, message } = error;
  
  switch (type) {
    case ErrorType.NETWORK:
      toast.error(message, {
        description: 'Please check your internet connection and try again.',
        duration: 5000,
      });
      break;
    
    case ErrorType.VALIDATION:
      toast.error(message, {
        description: 'Please correct the highlighted fields and try again.',
        duration: 4000,
      });
      break;
    
    case ErrorType.AUTHORIZATION:
      toast.error(message, {
        description: 'You may need to log in again.',
        duration: 6000,
      });
      break;
    
    case ErrorType.NOT_FOUND:
      toast.error(message, {
        description: 'The item you are looking for may have been deleted.',
        duration: 4000,
      });
      break;
    
    case ErrorType.SERVER:
      toast.error(message, {
        description: 'Our team has been notified. Please try again later.',
        duration: 6000,
      });
      break;
    
    default:
      toast.error(message, {
        duration: 4000,
      });
  }
}

// Combined error handler
export function handleAndShowError(error: unknown, context?: string): AppError {
  const appError = handleApiError(error, context);
  showErrorToast(appError);
  return appError;
}

// React Query error handler
export function createQueryErrorHandler(context: string) {
  return (error: unknown) => {
    handleAndShowError(error, context);
  };
}

// Success toast utility
export function showSuccessToast(message: string, description?: string): void {
  toast.success(message, {
    description,
    duration: 3000,
  });
}

// Info toast utility
export function showInfoToast(message: string, description?: string): void {
  toast.info(message, {
    description,
    duration: 4000,
  });
}

// Warning toast utility
export function showWarningToast(message: string, description?: string): void {
  toast.warning(message, {
    description,
    duration: 4000,
  });
}

// Retry utility for failed operations
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError;
}

// Form validation error handler
export function handleFormValidationError(
  error: unknown,
  setError: (field: string, error: { message: string }) => void
): void {
  const appError = classifyError(error, 'Form Validation');
  
  if (appError.type === ErrorType.VALIDATION && appError.originalError) {
    // If the error contains field-specific information, set field errors
    // This is a simplified implementation - you'd need to parse the actual error structure
    try {
      const errorData = JSON.parse(appError.originalError.message);
      if (errorData.fieldErrors) {
        Object.entries(errorData.fieldErrors).forEach(([field, message]) => {
          setError(field, { message: message as string });
        });
        return;
      }
    } catch {
      // Fallback to showing general error
    }
  }
  
  // Show general error toast if no field-specific errors
  showErrorToast(appError);
}

// Async operation wrapper with error handling
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    handleAndShowError(error, context);
    return null;
  }
}