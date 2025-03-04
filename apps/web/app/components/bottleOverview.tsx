import type { Bottle } from "@peated/server/types";
import RobotImage from "@peated/web/assets/robot.png";
import { Link } from "@remix-run/react";
import { Fragment } from "react";
import BottleReviews from "./bottleReviews.client";
import BottleTagDistribution from "./bottleTagDistribution.client";
import { ClientOnly } from "./clientOnly";
import DefinitionList from "./definitionList";
import Heading from "./heading";
import Markdown from "./markdown";
import QueryBoundary from "./queryBoundary";

export default function BottleOverview({ bottle }: { bottle: Bottle }) {
  return (
    <>
      <div className="my-6 px-3 md:px-0">
        <ClientOnly
          fallback={
            <div
              className="animate-pulse bg-slate-800"
              style={{ height: 200 }}
            />
          }
        >
          {() => (
            <QueryBoundary
              fallback={
                <div
                  className="animate-pulse bg-slate-800"
                  style={{ height: 200 }}
                />
              }
              loading={<Fragment />}
            >
              <BottleTagDistribution bottleId={bottle.id} />
            </QueryBoundary>
          )}
        </ClientOnly>
      </div>

      <div className="my-6 px-3 md:px-0">
        <div className="flex space-x-4">
          <div className="max-w-none flex-auto">
            <ClientOnly>
              {() => (
                <QueryBoundary
                  fallback={
                    <div
                      className="animate-pulse bg-slate-800"
                      style={{ height: 200 }}
                    />
                  }
                  loading={<Fragment />}
                >
                  <BottleReviews bottleId={bottle.id} />
                </QueryBoundary>
              )}
            </ClientOnly>
            {bottle.description && (
              <>
                <Heading as="h3">Summary</Heading>
                <div className="prose prose-invert -mt-1 max-w-none flex-auto">
                  <Markdown content={bottle.description} />
                </div>
              </>
            )}
            {bottle.tastingNotes && (
              <>
                <Heading as="h3">Tasting Notes</Heading>
                <DefinitionList>
                  <DefinitionList.Term>Nose</DefinitionList.Term>
                  <DefinitionList.Details>
                    {bottle.tastingNotes.nose}
                  </DefinitionList.Details>
                  <DefinitionList.Term>Palate</DefinitionList.Term>
                  <DefinitionList.Details>
                    {bottle.tastingNotes.palate}
                  </DefinitionList.Details>
                  <DefinitionList.Term>Finish</DefinitionList.Term>
                  <DefinitionList.Details>
                    {bottle.tastingNotes.finish}
                  </DefinitionList.Details>
                </DefinitionList>
              </>
            )}
            <Heading as="h3">Additional Details</Heading>
            <DefinitionList>
              <DefinitionList.Term>Brand</DefinitionList.Term>
              <DefinitionList.Details>
                <Link
                  key={bottle.brand.id}
                  to={`/entities/${bottle.brand.id}`}
                  className="underline"
                >
                  {bottle.brand.name}
                </Link>
              </DefinitionList.Details>{" "}
              <DefinitionList.Term>Distilled At</DefinitionList.Term>
              <DefinitionList.Details>
                {bottle.distillers.length > 0 ? (
                  <div className="flex space-x-2">
                    {bottle.distillers.map((d) => (
                      <Link
                        key={d.id}
                        to={`/entities/${d.id}`}
                        className="underline"
                      >
                        {d.name}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <em>unknown</em>
                )}
              </DefinitionList.Details>
              <DefinitionList.Term>Bottled By</DefinitionList.Term>
              <DefinitionList.Details>
                {bottle.bottler ? (
                  <Link
                    key={bottle.bottler.id}
                    to={`/entities/${bottle.bottler.id}`}
                    className="underline"
                  >
                    {bottle.bottler.name}
                  </Link>
                ) : (
                  <em>unknown</em>
                )}
              </DefinitionList.Details>
            </DefinitionList>
          </div>
          <img src={RobotImage} className="hidden h-40 w-40 sm:block" />
        </div>
      </div>
    </>
  );
}
