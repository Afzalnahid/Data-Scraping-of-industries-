import { saveSettingsSection, testConnection } from "../actions";
import { Flash, type SearchParams } from "../ui";
import { PLATFORMS, PLATFORM_LABELS } from "@/lib/config";
import { FIELDS, SECTIONS, loadRaw, type Field, type RawSetting, type SectionId } from "@/lib/settings";

export const dynamic = "force-dynamic";

const TESTABLE: SectionId[] = ["ai", "facebook", "linkedin", "x"];

function SecretStatus({ raw }: { raw: RawSetting }) {
  if (raw.source === "saved") return <span className="pill ok">Saved ••••{raw.value.slice(-4)}</span>;
  if (raw.source === "env") return <span className="pill ok">From Vercel env</span>;
  return <span className="pill">Not set</span>;
}

function Input({ field, raw }: { field: Field; raw: RawSetting }) {
  const value = raw.source === "none" ? "" : raw.value;
  switch (field.type) {
    case "secret":
      return (
        <>
          <div className="row">
            <SecretStatus raw={raw} />
            {raw.source === "saved" && (
              <label className="inline"><input type="checkbox" name={`${field.key}__clear`} /> remove</label>
            )}
          </div>
          <input name={field.key} type="password" autoComplete="off" placeholder={raw.source === "none" ? "Paste here" : "Paste to replace"} />
        </>
      );
    case "textarea":
      return <textarea name={field.key} defaultValue={value} rows={3} />;
    case "number":
      return <input name={field.key} type="number" step="any" defaultValue={value} />;
    case "toggle":
      return (
        <label className="inline">
          <input type="checkbox" name={field.key} defaultChecked={value !== "false"} /> Yes
        </label>
      );
    case "platforms": {
      const selected = value.split(",");
      return (
        <div className="row">
          {PLATFORMS.map((p) => (
            <label key={p} className="inline">
              <input type="checkbox" name={field.key} value={p} defaultChecked={selected.includes(p)} /> {PLATFORM_LABELS[p]}
            </label>
          ))}
        </div>
      );
    }
    default:
      return <input name={field.key} type="text" defaultValue={value} />;
  }
}

export default async function SettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const raw = await loadRaw();

  return (
    <>
      <Flash params={params} />
      <h1>Settings</h1>
      <p className="muted">
        Keys and tokens are encrypted before they are saved and are never shown again in full.
      </p>
      {(Object.keys(SECTIONS) as SectionId[]).map((section) => (
        <section key={section} id={section} className="card">
          <h2>{SECTIONS[section].title}</h2>
          <p className="muted">{SECTIONS[section].help}</p>
          <form action={saveSettingsSection}>
            <input type="hidden" name="section" value={section} />
            <div className="fields">
              {FIELDS.filter((f) => f.section === section).map((f) => (
                <div key={f.key} className="field">
                  <label className="label">{f.label}</label>
                  <Input field={f} raw={raw[f.key]} />
                  {f.help && <small className="muted">{f.help}</small>}
                </div>
              ))}
            </div>
            <div className="row">
              <button type="submit">Save</button>
              {TESTABLE.includes(section) && (
                <button type="submit" className="secondary" formAction={testConnection}>
                  Test connection
                </button>
              )}
            </div>
          </form>
        </section>
      ))}
    </>
  );
}
