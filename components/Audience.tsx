import {
  Megaphone,
  Clapperboard,
  User,
  GraduationCap,
  Briefcase,
  Palette,
} from "lucide-react";

const audiences = [
  { icon: Megaphone, label: "Marketing Agencies" },
  { icon: Clapperboard, label: "Video Editors" },
  { icon: User, label: "Freelancers" },
  { icon: GraduationCap, label: "Coaches" },
  { icon: Briefcase, label: "Consultants" },
  { icon: Palette, label: "Designers" },
];

export default function Audience() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Perfect for
        </h2>

        <ul className="mt-12 flex flex-wrap justify-center gap-3 sm:gap-4">
          {audiences.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="inline-flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm shadow-slate-200/50"
            >
              <Icon className="h-4.5 w-4.5 text-indigo-600" />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
