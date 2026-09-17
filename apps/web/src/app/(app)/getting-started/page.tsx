import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { serverApiFetch } from "@/lib/serverApi";
import type { GettingStartedModuleEntry } from "@/data/courses";
import styles from "./styles.module.css";

export const metadata: Metadata = {
    title: "Setup & Dependencies",
    description:
        "Find the guides for setting up the dependencies you need before starting your courses.",
};

export default async function GettingStartedPage(): Promise<React.JSX.Element> {
    const res = await serverApiFetch("/courses/getting-started");
    if (res.status === 401) {
        redirect("/login");
    }
    const modules: GettingStartedModuleEntry[] = res.ok ? await res.json() : [];

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.pageHeader}>
                    <p className={styles.pageSubtitle}>
                        Find the guides for setting up the dependencies you need
                        before starting your courses.
                    </p>
                </div>

                {modules.length === 0 ? (
                    <div className={styles.emptyText}>
                        <div
                            style={{
                                minHeight: "400px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                textAlign: "center",
                            }}
                        >
                            <svg
                                width="220"
                                height="220"
                                viewBox="0 0 220 220"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                aria-hidden="true"
                            >
                                {/* Folder */}
                                <path
                                    d="M48 72C48 65.4 53.4 60 60 60H91L101 72H160C166.6 72 172 77.4 172 84V151C172 157.6 166.6 163 160 163H60C53.4 163 48 157.6 48 151V72Z"
                                    fill="white"
                                    stroke="#9CA3AF"
                                    strokeWidth="5"
                                    strokeLinejoin="round"
                                />

                                {/* Folder tab */}
                                <path
                                    d="M48 82H172"
                                    stroke="#D1D5DB"
                                    strokeWidth="4"
                                />

                                {/* Document inside folder */}
                                <rect
                                    x="78"
                                    y="91"
                                    width="52"
                                    height="55"
                                    rx="6"
                                    fill="white"
                                    stroke="#6366F1"
                                    strokeWidth="4"
                                />

                                {/* Document lines */}
                                <path
                                    d="M89 106H119"
                                    stroke="#D1D5DB"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                />

                                <path
                                    d="M89 118H119"
                                    stroke="#D1D5DB"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                />

                                <path
                                    d="M89 130H110"
                                    stroke="#D1D5DB"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                />

                                {/* Small sparkle */}
                                <path
                                    d="M157 48L161 58L171 62L161 66L157 76L153 66L143 62L153 58L157 48Z"
                                    fill="#C4B5FD"
                                />

                                {/* Small floating dot */}
                                <circle cx="58" cy="48" r="5" fill="#D1D5DB" />
                            </svg>

                            <div
                                style={{
                                    marginTop: "20px",
                                    fontSize: "24px",
                                    fontWeight: 600,
                                    color: "#374151",
                                }}
                            >
                                No resources or guides published yet.
                            </div>

                            <div
                                style={{
                                    marginTop: "8px",
                                    fontSize: "16px",
                                    color: "#6B7280",
                                }}
                            >
                                Resources and guides will appear here once they
                                are published.
                            </div>
                        </div>
                    </div>
                ) : (
                    <ul className={styles.list}>
                        {modules.map((mod) => (
                            <li key={mod.id}>
                                <Link
                                    href={`/learn/${mod.course.slug}/${mod.slug}`}
                                    className={styles.item}
                                >
                                    <span className={styles.itemTitle}>
                                        {mod.title}
                                    </span>
                                    <span className={styles.itemCourse}>
                                        {mod.course.name}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
