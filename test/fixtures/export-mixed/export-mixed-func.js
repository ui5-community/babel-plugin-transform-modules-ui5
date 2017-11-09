
export default function def() {
  console.log("I'm the default");
}
export { def } // TODO detect the self reference and don't extend
export const named = {}
