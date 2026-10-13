export async function resolve(specifier, context, nextResolve) {
  try { return await nextResolve(specifier, context) }
  catch (error) {
    if (specifier.startsWith('.') && !specifier.split('/').at(-1).includes('.')) return nextResolve(specifier + '.js', context)
    throw error
  }
}
