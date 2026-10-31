import ItemPage from '../../../item/[slug]/page';
import { ItemLayer } from '../../../item-layer';

export default function InterceptedItem(props: { params: Promise<{ slug: string }> }) {
  return <ItemLayer><ItemPage {...props} /></ItemLayer>;
}
