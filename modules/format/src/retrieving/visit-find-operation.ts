import {
  FindOperation,
  SimpleFindOperation,
  isAndFindOperation,
  isNorFindOperation,
  isOrFindOperation,
} from "./find-operation";

import { QueryCondition } from "./query-condition";
import { normalizeQueryCondition } from "./normalize-query-condition";

export type FindOperationVisitor = {
  simpleFindOperation?: (operation: SimpleFindOperation) => SimpleFindOperation;
  queryCondition?: (condition: QueryCondition) => QueryCondition;
};

/**
 * @public
 * Modify FindOperation by passing visitor functions.
 */
export function visitFindOperation<T extends FindOperation>(
  where: T,
  visitor: FindOperationVisitor
): T {
  if (isAndFindOperation(where)) {
    return {
      $and: where.$and.map(subWhere => visitFindOperation(subWhere, visitor)),
    } as T;
  }

  if (isNorFindOperation(where)) {
    return {
      $nor: where.$nor.map(subWhere => visitFindOperation(subWhere, visitor)),
    } as T;
  }

  if (isOrFindOperation(where)) {
    return {
      $or: where.$or.map(subWhere => visitFindOperation(subWhere, visitor)),
    } as T;
  }
  // @ts-ignore `where` is SimpleFindOperation
  return visitSimpleFindOperation(where as SimpleFindOperation, visitor);
}

/**
 * @private
 */
function visitSimpleFindOperation(
  _where: SimpleFindOperation,
  visitor: FindOperationVisitor
): SimpleFindOperation {
  const where = visitor.simpleFindOperation
    ? visitor.simpleFindOperation(_where)
    : _where;
  const queryConditionVisitor = visitor.queryCondition;
  if (queryConditionVisitor == null) {
    return where;
  }
  const documentPaths = Object.keys(where);
  const modified: SimpleFindOperation = {};
  for (const documentPath of documentPaths) {
    const queryCondition = normalizeQueryCondition(where[documentPath]);
    modified[documentPath] = queryConditionVisitor(queryCondition);

    if (queryCondition.$not) {
      modified[documentPath] = Object.assign({}, modified[documentPath], {
        $not: queryConditionVisitor(queryCondition.$not),
      });
    }
  }
  return Object.assign({}, where, modified);
}
