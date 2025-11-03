import { UniqueEntityId } from './unique-entity-id';

interface EntityProps {
  id?: UniqueEntityId;
}

export abstract class Entity<T extends EntityProps> {
  protected readonly _id: UniqueEntityId;
  protected props: T;

  protected constructor(props: T) {
    this._id = props.id ?? UniqueEntityId.create();
    this.props = { ...props, id: this._id };
  }

  get id(): UniqueEntityId {
    return this._id;
  }
}
