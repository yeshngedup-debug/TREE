import Link from "next/link";
import { ArrowUpRight, Compass, Leaf, Sprout } from "lucide-react";
import styles from "./visitor-paths.module.css";

export function VisitorPaths() {
  return <nav aria-label="Choose your way into the tree">
    <div className={styles.paths}>
      <Link href="/join" className={styles.path} aria-labelledby="hope-path" aria-describedby="hope-detail">
        <Leaf size={21} aria-hidden="true"/><span><strong id="hope-path">Grow your leaf</strong><small id="hope-detail">Leave one anonymous hope. No account needed.</small></span><ArrowUpRight size={17} aria-hidden="true"/>
      </Link>
      <Link href="/create" className={styles.path} aria-labelledby="idea-path" aria-describedby="idea-detail">
        <Sprout size={21} aria-hidden="true"/><span><strong id="idea-path">Share an idea</strong><small id="idea-detail">Publish with your profile and invite discussion.</small></span><ArrowUpRight size={17} aria-hidden="true"/>
      </Link>
    </div>
    <Link href="/explore" className={styles.browse}><Compass size={16} aria-hidden="true"/> Wander Bhutan</Link>
  </nav>;
}
