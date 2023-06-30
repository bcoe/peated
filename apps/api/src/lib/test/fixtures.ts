import { faker } from "@faker-js/faker";
import { readFile } from "fs/promises";
import path from "path";

import { toTitleCase } from "@peated/shared/lib/strings";

import { eq, sql } from "drizzle-orm";
import { db } from "../../db";
import type {
  Entity as EntityType,
  NewBadge,
  NewBottle,
  NewComment,
  NewEntity,
  NewFollow,
  NewStore,
  NewStorePrice,
  NewStorePriceHistory,
  NewTasting,
  NewToast,
  NewUser,
  User as UserType,
} from "../../db/schema";
import {
  badges,
  bottleTags,
  bottles,
  bottlesToDistillers,
  changes,
  comments,
  entities,
  follows,
  storePriceHistories,
  storePrices,
  stores,
  tastings,
  toasts,
  users,
} from "../../db/schema";
import { createAccessToken } from "../auth";
import { choose, random, sample } from "../rand";
import { defaultTags } from "../tags";

import { CATEGORY_LIST } from "@peated/shared/constants";
export const User = async ({ ...data }: Partial<NewUser> = {}) => {
  return (
    await db
      .insert(users)
      .values({
        displayName: faker.person.firstName(),
        email: faker.internet.email(),
        username: faker.internet.userName().toLowerCase(),
        admin: false,
        mod: false,
        active: true,
        ...data,
      })
      .returning()
  )[0];
};

export const Follow = async ({ ...data }: Partial<NewFollow> = {}) => {
  return (
    await db
      .insert(follows)
      .values({
        fromUserId: data.fromUserId || (await User()).id,
        toUserId: data.toUserId || (await User()).id,
        status: "following",
        ...data,
      })
      .returning()
  )[0];
};

export const Entity = async ({ ...data }: Partial<NewEntity> = {}) => {
  const name = faker.company.name();
  const existing = await db.query.entities.findFirst({
    where: (entities, { eq }) => eq(entities.name, name),
  });
  if (existing) return existing;

  return await db.transaction(async (tx) => {
    const [entity] = await db
      .insert(entities)
      .values({
        name,
        country: faker.location.country(),
        type: ["brand", "distiller"],
        ...data,
        createdById: data.createdById || (await User()).id,
      })
      .returning();

    await tx.insert(changes).values({
      objectId: entity.id,
      objectType: "entity",
      type: "add",
      displayName: entity.name,
      createdAt: entity.createdAt,
      createdById: entity.createdById,
      data: entity,
    });

    return entity;
  });
};

export const Bottle = async ({
  distillerIds = [],
  ...data
}: Partial<NewBottle> & {
  distillerIds?: number[];
} = {}) => {
  return await db.transaction(async (tx) => {
    const brand = (
      data.brandId
        ? await db.query.entities.findFirst({
            where: (entities, { eq }) =>
              eq(entities.id, data.brandId as number),
          })
        : await Entity({
            totalBottles: 1,
          })
    ) as EntityType;
    const name =
      data.name ??
      toTitleCase(
        choose([
          faker.company.buzzNoun(),
          `${faker.company.buzzAdjective()} ${faker.company.buzzNoun()}`,
        ]),
      );
    const [bottle] = await tx
      .insert(bottles)
      .values({
        category: choose([...CATEGORY_LIST, undefined]),
        statedAge: choose([undefined, 3, 10, 12, 15, 18, 20, 25]),
        ...data,
        name,
        fullName: `${brand.name} ${name}`,
        brandId: brand.id,
        createdById: data.createdById || (await User()).id,
      })
      .returning();

    if (!distillerIds.length) {
      for (let i = 0; i < choose([0, 1, 1, 1, 2]); i++) {
        await tx.insert(bottlesToDistillers).values({
          bottleId: bottle.id,
          distillerId: (
            await Entity({ type: ["distiller"], totalBottles: 1 })
          ).id,
        });
      }
    } else {
      for (const d of distillerIds) {
        await tx.insert(bottlesToDistillers).values({
          bottleId: bottle.id,
          distillerId: d,
        });
      }
    }

    await tx.insert(changes).values({
      objectId: bottle.id,
      objectType: "bottle",
      displayName: bottle.fullName,
      type: "add",
      createdAt: bottle.createdAt,
      createdById: bottle.createdById,
      data: bottle,
    });

    return bottle;
  });
};

export const Tasting = async ({ ...data }: Partial<NewTasting> = {}) => {
  return await db.transaction(async (tx) => {
    const [result] = await tx
      .insert(tastings)
      .values({
        notes: faker.lorem.sentence(),
        rating: faker.number.float({ min: 1, max: 5 }),
        tags: sample(defaultTags, random(1, 5)),
        ...data,
        bottleId: data.bottleId || (await Bottle()).id,
        createdById: data.createdById || (await User()).id,
      })
      .returning();

    for (const tag of result.tags) {
      await tx
        .insert(bottleTags)
        .values({
          bottleId: result.bottleId,
          tag,
          count: 1,
        })
        .onConflictDoUpdate({
          target: [bottleTags.bottleId, bottleTags.tag],
          set: {
            count: sql<number>`${bottleTags.count} + 1`,
          },
        });
    }

    return result;
  });
};

export const Toast = async ({ ...data }: Partial<NewToast> = {}) => {
  return (
    await db
      .insert(toasts)
      .values({
        createdById: data.createdById || (await User()).id,
        tastingId: data.tastingId || (await Tasting()).id,
        ...data,
      })
      .returning()
  )[0];
};

export const Comment = async ({ ...data }: Partial<NewComment> = {}) => {
  return (
    await db
      .insert(comments)
      .values({
        createdById: data.createdById || (await User()).id,
        tastingId: data.tastingId || (await Tasting()).id,
        comment: faker.lorem.sentences(random(2, 5)),
        ...data,
      })
      .returning()
  )[0];
};

export const Badge = async ({ ...data }: Partial<NewBadge> = {}) => {
  return (
    await db
      .insert(badges)
      .values({
        name: faker.word.noun(),
        type: "category",
        config: {
          category: "single_malt",
        },
        ...data,
      })
      .returning()
  )[0];
};

export const Store = async ({ ...data }: Partial<NewStore> = {}) => {
  return (
    await db
      .insert(stores)
      .values({
        name: faker.company.name(),
        country: faker.location.country(),
        type: "totalwines",
        ...data,
      })
      .returning()
  )[0];
};

export const StorePrice = async ({ ...data }: Partial<NewStorePrice> = {}) => {
  if (!data.name) {
    const bottleId = (await Bottle()).id;
    if (!data.bottleId) data.bottleId = bottleId;
    const bottle = await db.query.bottles.findFirst({
      where: eq(bottles.id, bottleId),
      with: { brand: true },
    });
    if (!bottle) throw new Error("Unexpected");
    data.name = `${bottle.brand.name} ${bottle.name}`;
  }

  if (!data.price) data.price = parseInt(faker.finance.amount(50, 200, 0), 10);
  if (!data.url) data.url = faker.internet.url();

  return await db.transaction(async (tx) => {
    const [price] = await db
      .insert(storePrices)
      .values({
        // lazy fix for tsc
        name: "",
        price: 0,
        url: "",
        ...data,
        storeId: data.storeId || (await Store()).id,
      })
      .onConflictDoUpdate({
        target: [storePrices.storeId, storePrices.name],
        set: {
          bottleId: data.bottleId,
          price: data.price,
          url: data.url,
          updatedAt: sql`NOW()`,
        },
      })
      .returning();

    await tx
      .insert(storePriceHistories)
      .values({
        priceId: price.id,
        price: price.price,
        date: sql`CURRENT_DATE`,
      })
      .onConflictDoNothing();

    return price;
  });
};

export const StorePriceHistory = async ({
  ...data
}: Partial<NewStorePriceHistory> = {}) => {
  return (
    await db
      .insert(storePriceHistories)
      .values({
        price: parseInt(faker.finance.amount(50, 200, 0), 10),
        ...data,
        priceId: data.priceId || (await StorePrice()).id,
      })
      .returning()
  )[0];
};

export const AuthToken = async ({ user }: { user?: UserType | null } = {}) => {
  if (!user) user = await User();

  return await createAccessToken(user);
};

export const AuthenticatedHeaders = async ({
  user,
  mod,
  admin,
}: {
  user?: UserType | null;
  mod?: boolean;
  admin?: boolean;
} = {}) => {
  if (!user && admin) {
    user = await User({ admin: true });
  } else if (!user && mod) {
    user = await User({ mod: true });
  }
  return {
    Authorization: `Bearer ${await AuthToken({ user })}`,
  };
};

export const SampleSquareImage = async () => {
  return new Blob([await readFile(await SampleSquareImagePath())]);
};

export const SampleSquareImagePath = async () => {
  return path.join(__dirname, "assets", "sample-square-image.jpg");
};
