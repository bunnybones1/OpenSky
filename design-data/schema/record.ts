import t, {
  Infer,
  ObjectType,
  Type,
  ValidationError,
  keySignature
} from 'myzod'

export function createRecordSchema<
  K extends Type<string | number>,
  T extends ObjectType<any>
>(
  schema: T,
  primaryKey: K
): ObjectType<{
  [keySignature]: T
}> {
  return t
    .record(schema)
    .collectErrors()
    .withPredicate(records => {
      const recordErrors: Record<string, ValidationError> = {}
      const entries = Object.entries(records) as Array<[Infer<K>, Infer<T>]>
      for (const entry of entries) {
        try {
          primaryKey.parse(entry[0])
        } catch (err) {
          recordErrors[`${entry[0]}`] = new ValidationError(
            `Failed to parse primary key ${entry[0]}: ${
              err instanceof Error ? err.message : JSON.stringify(err)
            }`
          )
        }
      }
      if (Object.keys(recordErrors).length) {
        throw new ValidationError(
          `Invalid primary keys`,
          undefined,
          recordErrors
        )
      }
      return true
    })
}
