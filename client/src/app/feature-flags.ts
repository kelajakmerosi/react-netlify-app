export const UI_MIGRATION_FLAGS = {
  adminUseSharedFormPrimitives: true,
  adminUseSharedSegmentedControls: true,
} as const

export type UiMigrationFlag = keyof typeof UI_MIGRATION_FLAGS
