let one = 1;
export default async function() {
  // Since it"s anonymous, this can be safely moved to the end
  return (await one) + two;
}
let two = 2;
