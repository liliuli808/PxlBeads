import worker from '../../../worker';

type PagesContext = {
  request: Request;
  env: Record<string, unknown>;
};

export function onRequest({ request, env }: PagesContext): Promise<Response> {
  return worker.fetch(request, env as never);
}
