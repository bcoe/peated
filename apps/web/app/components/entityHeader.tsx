import type { Entity } from "@peated/server/types";
import EntityIcon from "@peated/web/components/assets/Entity";
import { Link } from "@remix-run/react";
import Chip from "./chip";
import PageHeader from "./pageHeader";

export default function EntityHeader({
  entity,
  to,
}: {
  entity: Entity;
  to?: string;
}) {
  return (
    <PageHeader
      icon={EntityIcon}
      title={entity.name}
      titleExtra={
        <div className="text-light max-w-full text-center lg:text-left">
          {!!entity.country && (
            <>
              Located in{" "}
              <Link
                to={`/entities?country=${encodeURIComponent(entity.country)}`}
                className="truncate hover:underline"
              >
                {entity.country}
              </Link>
            </>
          )}
          {!!entity.region && (
            <span>
              {" "}
              &middot;{" "}
              <Link
                to={`/entities?region=${encodeURIComponent(entity.region)}`}
                className="truncate hover:underline"
              >
                {entity.region}
              </Link>
            </span>
          )}
        </div>
      }
      metadata={
        <div className="flex gap-x-1">
          {entity.type.sort().map((t) => (
            <Chip
              key={t}
              size="small"
              color="highlight"
              as={Link}
              to={`/entities?type=${encodeURIComponent(t)}`}
            >
              {t}
            </Chip>
          ))}
        </div>
      }
    />
  );
}
