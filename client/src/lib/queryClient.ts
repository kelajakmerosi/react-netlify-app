import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            staleTime: 5 * 60 * 1000, // 5 minutes by default
            retry: 1,
        },
    },
})

// Centralized Query Key Factory
// Eliminates loose string-based query keys
export const queryKeys = {
    subjects: {
        all: () => ['subjects'] as const,
        list: (userId: string | null) => ['subjects', 'list', userId] as const,
        stats: (subjectId?: string) => ['subjects', 'stats', subjectId] as const,
    },
    topics: {
        all: () => ['topics'] as const,
        list: (subjectId: string) => [...queryKeys.subjects.all(), subjectId, 'topics'] as const,
        detail: (subjectId: string, topicId: string) => [...queryKeys.topics.list(subjectId), topicId] as const,
    },
    admin: {
        all: () => ['admin'] as const,
        users: () => [...queryKeys.admin.all(), 'users'] as const,
        analytics: (from?: string, to?: string) => [...queryKeys.admin.all(), 'analytics', { from, to }] as const,
    },
    // Add more keys as needed...
}
