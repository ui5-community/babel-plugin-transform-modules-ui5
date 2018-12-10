export default function def() {
  console.log("I am the default");
}
def.hey = "hey";
export { def }; // TODO: detect the self reference and don"t extend
export const named = {};
