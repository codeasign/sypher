import type { Metadata } from "next";
import { serverApiFetch } from "@/lib/serverApi";
import type { CodingProblemSummary } from "@/data/codingProblems";
import CodingProblemsBoard from "@/components/CodingProblemsBoard";
import styles from "./styles.module.css";

export const metadata: Metadata = {
    title: "Practice Coding",
    description: "Coding practice problems, grouped by pattern, with a built-in IDE and verified solutions.",
};

export default async function PracticeCodingPage(): Promise<React.JSX.Element> {
    const res = await serverApiFetch("/coding-problems");
    const problems: CodingProblemSummary[] = res.ok ? await res.json() : [];

    const bookmarksRes = await serverApiFetch("/coding-problems/bookmarks/mine");
    const bookmarkedIds: string[] = bookmarksRes.ok ? await bookmarksRes.json() : [];

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.pageHeader}>
                    <h1 className={styles.pageTitle}>Practice Coding</h1>
                    <p className={styles.pageSubtitle}>
                        Sharpen your skills with pattern-grouped coding problems, a built-in IDE, and verified solutions.
                    </p>
                </div>

                <CodingProblemsBoard problems={problems} bookmarkedIds={bookmarkedIds} />
            </div>
        </div>
    );
}
