export { default } from "../../components/product/ProductShelf.tsx";

export function LoadingFallback() {
  return (
    <div style={{ height: "716px" }} class="flex justify-center items-center">
      <span class="loading loading-spinner" />
    </div>
  );
}

export function ErrorFallback({ error }: { error?: Error }) {
  // Your error handling logic goes here
  // You can display an error message, log the error, or render a fallback UI
  return (
    <div>
      <h2>Oops! Something went wrong.</h2>
      <pre>{JSON.stringify(error, null, 4)}</pre>
    </div>
  );
}
