export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { getNotion, getDbId } from "@/lib/notion";

async function getData() {
  const notion = getNotion();
  const DB_ID = getDbId();

  // quick sanity check (remove after it works)
  // console.log('has databases?', typeof (notion as any).databases, 'has query?', typeof (notion as any).databases?.query);

  // Preferred path (should work on 2.x):
  const hasHelper = typeof (notion as any).databases?.query === "function";

  if (hasHelper) {
    const res = await (notion as any).databases.query({
      database_id: DB_ID,
      page_size: 100,
      sorts: [{ timestamp: "created_time", direction: "descending" }],
    });
    return res.results as any[];
  }

  // Fallback: low-level request (always works)
  const res = await (notion as any).request({
    path: `databases/${DB_ID}/query`,
    method: "POST",
    body: {
      page_size: 100,
      sorts: [{ timestamp: "created_time", direction: "descending" }],
    },
  });

  return res.results as any[];
}

export default async function Page() {
  const rows = await getData();

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">
        Toronto JobBot — Applications
      </h1>
      <div className="overflow-x-auto rounded-2xl shadow">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-800">
            <tr className="font-semibold text-xs uppercase tracking-wide">
              <th className="p-3 text-left">Company</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Followup</th>
              <th className="p-3 text-left">URL</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => {
              const props = r.properties;
              const titleKey = Object.keys(props).find(
                (k) => props[k].type === "title"
              )!;
              const company = props[titleKey]?.title?.[0]?.plain_text ?? "";

              // Eğer company boşsa → render etme
              if (!company) return null;

              const statusKey = Object.keys(props).find((k) =>
                ["status", "select"].includes(props[k].type)
              )!;
              const dateKey = Object.keys(props).find(
                (k) => props[k].type === "date"
              );
              const urlKey = Object.keys(props).find(
                (k) => props[k].type === "url"
              );
              const richKeys = Object.keys(props).filter(
                (k) => props[k].type === "rich_text"
              );

              const role = richKeys[0]
                ? props[richKeys[0]]?.rich_text?.[0]?.plain_text ?? ""
                : "";
              const status =
                props[statusKey]?.[props[statusKey].type]?.name ?? "";
              const followup = dateKey ? props[dateKey]?.date?.start ?? "" : "";
              const url = urlKey ? props[urlKey]?.url ?? "" : "";

              return (
                <tr key={r.id} className="border-t">
                  <td className="p-3">{company}</td>
                  <td className="p-3">{role}</td>
                  <td className="p-3">
                    {status && (
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs
                ${
                  status.toLowerCase() === "applied"
                    ? "bg-green-100 text-green-800"
                    : status.toLowerCase() === "saved"
                    ? "bg-yellow-100 text-yellow-800"
                    : status.toLowerCase().includes("interview")
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
                }`}
                      >
                        {status}
                      </span>
                    )}
                  </td>
                  <td className="p-3">{followup}</td>
                  <td className="p-3">
                    {url ? (
                      <a className="underline" href={url} target="_blank">
                        link
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500 mt-3">Data source: Notion</p>
    </main>
  );
}
