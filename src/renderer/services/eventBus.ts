// Event Bus for cross-component cache invalidation and entity synchronization

export type EntityType =
  | 'clients'
  | 'cases'
  | 'settings'
  | 'tasks'
  | 'executions'
  | 'hearings'
  | 'finance'
  | 'announcements'
  | 'trash';

type Listener = () => void;

class EntityEventBus {
  private listeners: Map<EntityType, Set<Listener>> = new Map();

  public subscribe(entity: EntityType, callback: Listener): () => void {
    if (!this.listeners.has(entity)) {
      this.listeners.set(entity, new Set());
    }
    this.listeners.get(entity)!.add(callback);

    return () => {
      this.listeners.get(entity)?.delete(callback);
    };
  }

  public emit(entity: EntityType): void {
    const entityListeners = this.listeners.get(entity);
    if (entityListeners) {
      entityListeners.forEach((cb) => {
        try {
          cb();
        } catch (err) {
          console.error(`Error in eventBus listener for ${entity}:`, err);
        }
      });
    }
  }

  public emitMultiple(entities: EntityType[]): void {
    entities.forEach((e) => this.emit(e));
  }
}

export const entityEventBus = new EntityEventBus();
