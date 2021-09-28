(function () {
    'use strict';

    function noop() { }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dset(obj, keys, val) {
    	keys.split && (keys=keys.split('.'));
    	var i=0, l=keys.length, t=obj, x, k;
    	for (; i < l;) {
    		k = keys[i++];
    		if (k === '__proto__' || k === 'constructor' || k === 'prototype') break;
    		t = t[k] = (i === l) ? val : (typeof(x=t[k])===typeof(keys)) ? x : (keys[i]*0 !== 0 || !!~(''+keys[i]).indexOf('.')) ? {} : [];
    	}
    }

    function dlv(t,e,l,n,r){for(e=e.split?e.split("."):e,n=0;n<e.length;n++)t=t?t[e[n]]:r;return t===r?l:t}

    /*

    Note on escaping order, from RFC6901:

    > Evaluation of each reference token begins by decoding any escaped
    > character sequence.  This is performed by first transforming any
    > occurrence of the sequence '~1' to '/', and then transforming any
    > occurrence of the sequence '~0' to '~'.  By performing the
    > substitutions in this order, an implementation avoids the error of
    > turning '~01' first into '~1' and then into '/', which would be
    > incorrect (the string '~01' correctly becomes '~1' after
    > transformation).

    */

    /**
     * Convert a JSON Pointer into a list of unescaped tokens, e.g. `/foo/bar~1biz` to `['foo','bar/biz']`.
     * @type {import("../index").toTokens}
     */
    const toTokens = function (path) {
    	[ , ...path ] = path.split('/');
    	let segments = [];
    	for (let segment of path) {
    		segments.push(segment.replaceAll('~1', '/').replaceAll('~0', '~'));
    	}
    	return segments
    };

    /**
     * @param {String|Array<String>} input
     * @returns {Array<String>}
     */
    const makeConsistent = input => input.split ? toTokens(input) : input;

    /**
     * Access a property by JSON Pointer, or by an array of property tokens.
     * @type {import("../index").get}
     */
    const get = function (obj, path) {
    	return dlv(obj, makeConsistent(path))
    };

    /**
     * Set a deep property by JSON Pointer, or by an array of property tokens.
     * @type {import("../index").set}
     */
    function set(obj, path, value) {
    	dset(obj, makeConsistent(path), value);
    	return obj
    }

    /**
     * Remove a deep property by JSON Pointer, or by an array of property tokens.
     * @type {import("../index").del}
     */
    function del(obj, path) {
    	let segments = makeConsistent(path);
    	let last = segments.pop();
    	let item = dlv(obj, segments);
    	if (Array.isArray(item)) item.splice(parseInt(last, 10), 1);
    	else if (item) delete item[last];
    	dset(obj, segments, item);
    	return obj
    }

    /* docs/InputText.svelte generated by Svelte v3.43.0 */

    function create_if_block(ctx) {
    	let div;
    	let t;

    	return {
    		c() {
    			div = element("div");
    			t = text(/*error*/ ctx[3]);
    			attr(div, "class", "invalid-feedback");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*error*/ 8) set_data(t, /*error*/ ctx[3]);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$2(ctx) {
    	let label_1;
    	let t0;
    	let t1;
    	let input;
    	let t2;
    	let if_block_anchor;
    	let mounted;
    	let dispose;
    	let if_block = /*error*/ ctx[3] && create_if_block(ctx);

    	return {
    		c() {
    			label_1 = element("label");
    			t0 = text(/*label*/ ctx[0]);
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr(label_1, "for", /*elementId*/ ctx[2]);
    			attr(input, "type", "text");
    			input.readOnly = /*readonly*/ ctx[1];
    			input.value = /*value*/ ctx[4];
    			attr(input, "id", /*elementId*/ ctx[2]);
    		},
    		m(target, anchor) {
    			insert(target, label_1, anchor);
    			append(label_1, t0);
    			insert(target, t1, anchor);
    			insert(target, input, anchor);
    			insert(target, t2, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);

    			if (!mounted) {
    				dispose = [
    					listen(input, "input", /*oninput*/ ctx[5]),
    					listen(input, "*", /*_handler*/ ctx[10])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*label*/ 1) set_data(t0, /*label*/ ctx[0]);

    			if (dirty & /*elementId*/ 4) {
    				attr(label_1, "for", /*elementId*/ ctx[2]);
    			}

    			if (dirty & /*readonly*/ 2) {
    				input.readOnly = /*readonly*/ ctx[1];
    			}

    			if (dirty & /*value*/ 16 && input.value !== /*value*/ ctx[4]) {
    				input.value = /*value*/ ctx[4];
    			}

    			if (dirty & /*elementId*/ 4) {
    				attr(input, "id", /*elementId*/ ctx[2]);
    			}

    			if (/*error*/ ctx[3]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(label_1);
    			if (detaching) detach(t1);
    			if (detaching) detach(input);
    			if (detaching) detach(t2);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let accessor;
    	let value;
    	let error;
    	let elementId;
    	let { label } = $$props;
    	let { form } = $$props;
    	let { id } = $$props;
    	let { keypath } = $$props;
    	let { readonly } = $$props;
    	const dispatcher = createEventDispatcher();
    	const oninput = event => dispatcher('formChange', { id, keypath, value: event.target.value });

    	function _handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ('label' in $$props) $$invalidate(0, label = $$props.label);
    		if ('form' in $$props) $$invalidate(6, form = $$props.form);
    		if ('id' in $$props) $$invalidate(7, id = $$props.id);
    		if ('keypath' in $$props) $$invalidate(8, keypath = $$props.keypath);
    		if ('readonly' in $$props) $$invalidate(1, readonly = $$props.readonly);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*id, keypath*/ 384) {
    			$$invalidate(9, accessor = [id, ...keypath || []]);
    		}

    		if ($$self.$$.dirty & /*form, accessor*/ 576) {
    			$$invalidate(4, value = get(form.data, accessor) || '');
    		}

    		if ($$self.$$.dirty & /*form, accessor*/ 576) {
    			$$invalidate(3, error = get(form.errors, accessor));
    		}

    		if ($$self.$$.dirty & /*accessor*/ 512) {
    			/**
     * It is likely true that for each JSON:API resource + keypath, that you'll only have one
     * element. Therefore, an ID based on those properties is likely unique to the page. If that
     * is not true for your form, you'd need to do something extra here
     * @type string
     */
    			$$invalidate(2, elementId = accessor.join('.'));
    		}
    	};

    	return [
    		label,
    		readonly,
    		elementId,
    		error,
    		value,
    		oninput,
    		form,
    		id,
    		keypath,
    		accessor,
    		_handler
    	];
    }

    class InputText extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			label: 0,
    			form: 6,
    			id: 7,
    			keypath: 8,
    			readonly: 1
    		});
    	}
    }

    /* docs/CarForm.svelte generated by Svelte v3.43.0 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	return child_ctx;
    }

    // (91:3) {#each (form.data[wheel.id]?.relationships?.positions?.data || []) as position}
    function create_each_block_1(ctx) {
    	let inputtext;
    	let t0;
    	let button;
    	let t2;
    	let br;
    	let current;
    	let mounted;
    	let dispose;

    	inputtext = new InputText({
    			props: {
    				label: "Position",
    				id: /*position*/ ctx[18].id,
    				keypath: ['attributes', 'name'],
    				form: /*form*/ ctx[0],
    				readonly: /*readonly*/ ctx[1]
    			}
    		});

    	inputtext.$on("formChange", /*formChange_handler_2*/ ctx[10]);

    	function click_handler() {
    		return /*click_handler*/ ctx[11](/*position*/ ctx[18]);
    	}

    	return {
    		c() {
    			create_component(inputtext.$$.fragment);
    			t0 = space();
    			button = element("button");
    			button.textContent = "Remove Position";
    			t2 = space();
    			br = element("br");
    		},
    		m(target, anchor) {
    			mount_component(inputtext, target, anchor);
    			insert(target, t0, anchor);
    			insert(target, button, anchor);
    			insert(target, t2, anchor);
    			insert(target, br, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen(button, "click", click_handler);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const inputtext_changes = {};
    			if (dirty & /*form, wheels*/ 5) inputtext_changes.id = /*position*/ ctx[18].id;
    			if (dirty & /*form*/ 1) inputtext_changes.form = /*form*/ ctx[0];
    			if (dirty & /*readonly*/ 2) inputtext_changes.readonly = /*readonly*/ ctx[1];
    			inputtext.$set(inputtext_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(inputtext.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(inputtext.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(inputtext, detaching);
    			if (detaching) detach(t0);
    			if (detaching) detach(button);
    			if (detaching) detach(t2);
    			if (detaching) detach(br);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (80:1) {#each wheels as wheel}
    function create_each_block(ctx) {
    	let div;
    	let inputtext;
    	let t0;
    	let br0;
    	let t1;
    	let t2;
    	let br1;
    	let t3;
    	let button0;
    	let t5;
    	let br2;
    	let t6;
    	let button1;
    	let current;
    	let mounted;
    	let dispose;

    	inputtext = new InputText({
    			props: {
    				label: "Size",
    				id: /*wheel*/ ctx[15].id,
    				keypath: ['attributes', 'size'],
    				form: /*form*/ ctx[0],
    				readonly: /*readonly*/ ctx[1]
    			}
    		});

    	inputtext.$on("formChange", /*formChange_handler_1*/ ctx[9]);
    	let each_value_1 = /*form*/ ctx[0].data[/*wheel*/ ctx[15].id]?.relationships?.positions?.data || [];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[12](/*wheel*/ ctx[15]);
    	}

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[13](/*wheel*/ ctx[15]);
    	}

    	return {
    		c() {
    			div = element("div");
    			create_component(inputtext.$$.fragment);
    			t0 = space();
    			br0 = element("br");
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			br1 = element("br");
    			t3 = space();
    			button0 = element("button");
    			button0.textContent = "Add Position";
    			t5 = space();
    			br2 = element("br");
    			t6 = space();
    			button1 = element("button");
    			button1.textContent = "Remove Wheel";
    			set_style(div, "border", "1px solid #000");
    			set_style(div, "padding", "15px");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(inputtext, div, null);
    			append(div, t0);
    			append(div, br0);
    			append(div, t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append(div, t2);
    			append(div, br1);
    			append(div, t3);
    			append(div, button0);
    			append(div, t5);
    			append(div, br2);
    			append(div, t6);
    			append(div, button1);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(button0, "click", click_handler_1),
    					listen(button1, "click", click_handler_2)
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const inputtext_changes = {};
    			if (dirty & /*wheels*/ 4) inputtext_changes.id = /*wheel*/ ctx[15].id;
    			if (dirty & /*form*/ 1) inputtext_changes.form = /*form*/ ctx[0];
    			if (dirty & /*readonly*/ 2) inputtext_changes.readonly = /*readonly*/ ctx[1];
    			inputtext.$set(inputtext_changes);

    			if (dirty & /*removePosition, form, wheels, readonly*/ 71) {
    				each_value_1 = /*form*/ ctx[0].data[/*wheel*/ ctx[15].id]?.relationships?.positions?.data || [];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, t2);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(inputtext.$$.fragment, local);

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			transition_out(inputtext.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(inputtext);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	let inputtext;
    	let t0;
    	let div;
    	let h3;
    	let t2;
    	let t3;
    	let button;
    	let current;
    	let mounted;
    	let dispose;

    	inputtext = new InputText({
    			props: {
    				label: "Color",
    				id: "001",
    				keypath: ['attributes', 'color'],
    				form: /*form*/ ctx[0],
    				readonly: /*readonly*/ ctx[1]
    			}
    		});

    	inputtext.$on("formChange", /*formChange_handler*/ ctx[8]);
    	let each_value = /*wheels*/ ctx[2];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			create_component(inputtext.$$.fragment);
    			t0 = space();
    			div = element("div");
    			h3 = element("h3");
    			h3.textContent = "Wheels";
    			t2 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t3 = space();
    			button = element("button");
    			button.textContent = "Add Wheel";
    			set_style(h3, "margin-top", "0");
    			set_style(div, "background-color", "#ddd");
    			set_style(div, "padding", "1em");
    			set_style(div, "margin", "1em");
    		},
    		m(target, anchor) {
    			mount_component(inputtext, target, anchor);
    			insert(target, t0, anchor);
    			insert(target, div, anchor);
    			append(div, h3);
    			append(div, t2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append(div, t3);
    			append(div, button);
    			current = true;

    			if (!mounted) {
    				dispose = listen(button, "click", /*addWheel*/ ctx[3]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			const inputtext_changes = {};
    			if (dirty & /*form*/ 1) inputtext_changes.form = /*form*/ ctx[0];
    			if (dirty & /*readonly*/ 2) inputtext_changes.readonly = /*readonly*/ ctx[1];
    			inputtext.$set(inputtext_changes);

    			if (dirty & /*removeWheel, wheels, addPositionToWheel, form, removePosition, readonly*/ 119) {
    				each_value = /*wheels*/ ctx[2];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, t3);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(inputtext.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			transition_out(inputtext.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			destroy_component(inputtext, detaching);
    			if (detaching) detach(t0);
    			if (detaching) detach(div);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let wheels;
    	let { carId } = $$props;
    	let { form } = $$props;
    	let { readonly } = $$props;

    	/**
     * For any editable related resources, you'll need to create dispatchers to send the
     * createResource/removeResource events. Here they are in the CarForm component, but
     * it's likely that they'll be embedded in deeper components, in which case you'd
     * simply forward the event along:
     *   <WheelEditor on:createResource on:removeResource {data} ... />
     */
    	const dispatcher = createEventDispatcher();

    	const addWheel = () => dispatcher('createResource', {
    		relatedId: carId,
    		relatedName: 'wheels',
    		isArray: true,
    		type: 'wheel'
    	});

    	/**
     * If the resource you are removing has relationships, those related resources are
     * not automatically removed (see the `removePosition` function below), so if you
     * know that removing them is appropriate, you will need to do that by hand.
     */
    	const removeWheel = wheelId => {
    		for (const { id, type } of form.data[wheelId]?.relationships?.positions?.data || []) {
    			dispatcher('removeResource', { id, type });
    		}

    		dispatcher('removeResource', { id: wheelId, type: 'wheel' });
    	};

    	const addPositionToWheel = wheelId => dispatcher('createResource', {
    		relatedId: wheelId,
    		relatedName: 'positions',
    		isArray: true,
    		type: 'position'
    	});

    	const removePosition = positionId => dispatcher('removeResource', { id: positionId, type: 'position' });

    	function formChange_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function formChange_handler_1(event) {
    		bubble.call(this, $$self, event);
    	}

    	function formChange_handler_2(event) {
    		bubble.call(this, $$self, event);
    	}

    	const click_handler = position => removePosition(position.id);
    	const click_handler_1 = wheel => addPositionToWheel(wheel.id);
    	const click_handler_2 = wheel => removeWheel(wheel.id);

    	$$self.$$set = $$props => {
    		if ('carId' in $$props) $$invalidate(7, carId = $$props.carId);
    		if ('form' in $$props) $$invalidate(0, form = $$props.form);
    		if ('readonly' in $$props) $$invalidate(1, readonly = $$props.readonly);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*form, carId*/ 129) {
    			/**
     * For any related resources that we want to build components for, we will
     * want to construct them reactively, so that adding/removing them (editing
     * the form) will automatically update the view.
     */
    			$$invalidate(2, wheels = form.data[carId]?.relationships?.wheels?.data || []);
    		}
    	};

    	return [
    		form,
    		readonly,
    		wheels,
    		addWheel,
    		removeWheel,
    		addPositionToWheel,
    		removePosition,
    		carId,
    		formChange_handler,
    		formChange_handler_1,
    		formChange_handler_2,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class CarForm extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { carId: 7, form: 0, readonly: 1 });
    	}
    }

    const fetchCarFromApi = async () => ({
    	// Normal JSON:API response format:
    	data: {
    		id: '001',
    		type: 'car',
    		attributes: {
    			color: 'red'
    		}
    	}
    });

    var justDiff = {
      diff: diff$1,
      jsonPatchPathConverter: jsonPatchPathConverter,
    };

    /*
      const obj1 = {a: 4, b: 5};
      const obj2 = {a: 3, b: 5};
      const obj3 = {a: 4, c: 5};

      diff(obj1, obj2);
      [
        { "op": "replace", "path": ['a'], "value": 3 }
      ]

      diff(obj2, obj3);
      [
        { "op": "remove", "path": ['b'] },
        { "op": "replace", "path": ['a'], "value": 4 }
        { "op": "add", "path": ['c'], "value": 5 }
      ]

      // using converter to generate jsPatch standard paths
      // see http://jsonpatch.com
      import {diff, jsonPatchPathConverter} from 'just-diff'
      diff(obj1, obj2, jsonPatchPathConverter);
      [
        { "op": "replace", "path": '/a', "value": 3 }
      ]

      diff(obj2, obj3, jsonPatchPathConverter);
      [
        { "op": "remove", "path": '/b' },
        { "op": "replace", "path": '/a', "value": 4 }
        { "op": "add", "path": '/c', "value": 5 }
      ]

      // arrays
      const obj4 = {a: 4, b: [1, 2, 3]};
      const obj5 = {a: 3, b: [1, 2, 4]};
      const obj6 = {a: 3, b: [1, 2, 4, 5]};

      diff(obj4, obj5);
      [
        { "op": "replace", "path": ['a'], "value": 3 }
        { "op": "replace", "path": ['b', 2], "value": 4 }
      ]

      diff(obj5, obj6);
      [
        { "op": "add", "path": ['b', 3], "value": 5 }
      ]

      // nested paths
      const obj7 = {a: 4, b: {c: 3}};
      const obj8 = {a: 4, b: {c: 4}};
      const obj9 = {a: 5, b: {d: 4}};

      diff(obj7, obj8);
      [
        { "op": "replace", "path": ['b', 'c'], "value": 4 }
      ]

      diff(obj8, obj9);
      [
        { "op": "replace", "path": ['a'], "value": 5 }
        { "op": "remove", "path": ['b', 'c']}
        { "op": "add", "path": ['b', 'd'], "value": 4 }
      ]
    */

    function diff$1(obj1, obj2, pathConverter) {
      if (!obj1 || typeof obj1 != 'object' || !obj2 || typeof obj2 != 'object') {
        throw new Error('both arguments must be objects or arrays');
      }

      pathConverter ||
        (pathConverter = function(arr) {
          return arr;
        });

      function getDiff(obj1, obj2, basePath, diffs) {
        var obj1Keys = Object.keys(obj1);
        var obj1KeysLength = obj1Keys.length;
        var obj2Keys = Object.keys(obj2);
        var obj2KeysLength = obj2Keys.length;
        var path;

        for (var i = 0; i < obj1KeysLength; i++) {
          var key = Array.isArray(obj1) ? Number(obj1Keys[i]) : obj1Keys[i];
          if (!(key in obj2)) {
            path = basePath.concat(key);
            diffs.remove.push({
              op: 'remove',
              path: pathConverter(path),
            });
          }
        }

        for (var i = 0; i < obj2KeysLength; i++) {
          var key = Array.isArray(obj2) ? Number(obj2Keys[i]) : obj2Keys[i];
          var obj1AtKey = obj1[key];
          var obj2AtKey = obj2[key];
          if (!(key in obj1)) {
            path = basePath.concat(key);
            var obj2Value = obj2[key];
            diffs.add.push({
              op: 'add',
              path: pathConverter(path),
              value: obj2Value,
            });
          } else if (obj1AtKey !== obj2AtKey) {
            if (
              Object(obj1AtKey) !== obj1AtKey ||
              Object(obj2AtKey) !== obj2AtKey
            ) {
              path = pushReplace(path, basePath, key, diffs, pathConverter, obj2);
            } else {
              if (
                !Object.keys(obj1AtKey).length &&
                !Object.keys(obj2AtKey).length &&
                String(obj1AtKey) != String(obj2AtKey)
              ) {
                path = pushReplace(path, basePath, key, diffs, pathConverter, obj2);
              } else {
                getDiff(obj1[key], obj2[key], basePath.concat(key), diffs);
              }
            }
          }
        }

        return diffs.remove
          .reverse()
          .concat(diffs.replace)
          .concat(diffs.add);
      }
      return getDiff(obj1, obj2, [], {remove: [], replace: [], add: []});
    }

    function pushReplace(path, basePath, key, diffs, pathConverter, obj2) {
      path = basePath.concat(key);
      diffs.replace.push({
        op: 'replace',
        path: pathConverter(path),
        value: obj2[key],
      });
      return path;
    }

    function jsonPatchPathConverter(arrayPath) {
      return [''].concat(arrayPath).join('/');
    }

    const { diff } = justDiff;

    const copy = input => JSON.parse(JSON.stringify(input));

    /**
     * Create a JSON:API Form object, decoupling the original from the mutable data.
     *
     * @type {import('..').formFromResponse}
     */
    const formFromResponse = response => {
    	const data = {};
    	const original = {};
    	data[response.data.id] = response.data;
    	original[response.data.id] = copy(response.data);
    	if (response.included) {
    		for (const resource of response.included) {
    			data[resource.id] = resource;
    			original[resource.id] = copy(resource);
    		}
    	}
    	return { data, original, changes: {} }
    };

    /**
     * Handle formChange events emitted by JSON:API Forms by updating the form and calculating changes.
     *
     * @type {import('..').onFormChange}
     */
    const onFormChange = (form, { detail: { id, keypath, value } }) => {
    	const changeKey = [ 'data', id, ...keypath ];
    	if (value !== undefined) {
    		set(form, changeKey, value);
    	} else {
    		del(form, changeKey);
    	}
    	form.changes[id] = diff(form.original[id] || {}, form.data[id] || {});
    	return form
    };

    /**
     * Given a `resourceCreate` event, update the JSON:Api Form with a resource containing an auto-generated
     * identifier, and adds the form relationship to the defined path.
     *
     * @type {import('..').resourceCreator}
     */
    const resourceCreator = (startingCount = 0) => {
    	let count = startingCount;
    	return (form, { detail: { relatedId, relatedName, isArray, type } }) => {
    		let id = `GID${++count}`;
    		form.data[id] = { type, id };
    		let relatedKeypath = [ relatedId, 'relationships', relatedName, 'data' ];
    		set(
    			form.data,
    			relatedKeypath,
    			isArray
    				? [ ...(get(form.data, relatedKeypath) || []), { type, id } ]
    				: { type, id }
    		);
    		form.changes[id] = diff({}, form.data[id]);
    		if (!form.changes[id].length) delete form.changes[id];
    		return form
    	}
    };

    /**
     * Given a `resourceRemove` event, update the JSON:Api Form by deleting that resource, and removing from
     * all relationships across all resources.
     *
     * @type {import('..').removeResource}
     */
    function removeResource (form, { detail: { id, type } }) {
    	delete form.data[id];
    	form.changes[id] = diff(form.original[id] || {}, form.data[id] || {});

    	for (let resourceId in form.data) {
    		let resource = form.data[resourceId];
    		for (let relationshipName of Object.keys(resource.relationships || {})) {
    			const relationship = resource.relationships[relationshipName];
    			if (Array.isArray(relationship.data)) {
    				relationship.data = relationship.data.filter(r => r.id !== id || r.type !== type);
    				if (!relationship.data.length) delete relationship.data;
    			} else if (relationship?.data?.id === id && relationship?.data?.type === type) {
    				delete relationship.data;
    			}
    			if (!relationship.data) delete resource.relationships[relationshipName];
    		}
    		if (!Object.keys(resource.relationships || {}).length) delete resource.relationships;

    		// Note: this could probably be optimized, to only check for diffs on the items that had
    		// their relationships changed.
    		form.changes[resourceId] = diff(form.original[resourceId] || {}, form.data[resourceId] || {});
    	}

    	for (let id in form.changes) {
    		if (!form.changes[id].length) delete form.changes[id];
    	}

    	return form
    }

    /* docs/App.svelte generated by Svelte v3.43.0 */

    function create_fragment(ctx) {
    	let h1;
    	let t1;
    	let p0;
    	let t7;
    	let hr0;
    	let t8;
    	let p1;
    	let t10;
    	let button0;
    	let t12;
    	let hr1;
    	let t13;
    	let h2;
    	let t15;
    	let carform;
    	let t16;
    	let p2;
    	let t18;
    	let button1;
    	let t19;
    	let button1_disabled_value;
    	let t20;
    	let hr2;
    	let t21;
    	let p3;
    	let t25;
    	let pre;
    	let t26_value = JSON.stringify(/*form*/ ctx[0], undefined, 4) + "";
    	let t26;
    	let current;
    	let mounted;
    	let dispose;

    	carform = new CarForm({
    			props: {
    				carId: "001",
    				form: /*form*/ ctx[0],
    				readonly
    			}
    		});

    	carform.$on("formChange", /*formChange_handler*/ ctx[4]);
    	carform.$on("createResource", /*createResource_handler*/ ctx[5]);
    	carform.$on("removeResource", /*removeResource_handler*/ ctx[6]);

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "JSON:API Svelte Form (Demo)";
    			t1 = space();
    			p0 = element("p");

    			p0.innerHTML = `This is a demo of the
	<a href="https://github.com/saibotsivad/jsonapi-svelte-form"><code>jsonapi-svelte-form</code></a>
	library, which is a tool to help make forms which use
	<a href="https://jsonapi.org/">JSON:API</a>
	for the backend.`;

    			t7 = space();
    			hr0 = element("hr");
    			t8 = space();
    			p1 = element("p");
    			p1.textContent = "You would probably normally use your routing library or other framework tools to\n\tload data for a form, but here we're simulating it by \"fetching\" from a mock API.";
    			t10 = space();
    			button0 = element("button");
    			button0.textContent = "Load Car";
    			t12 = space();
    			hr1 = element("hr");
    			t13 = space();
    			h2 = element("h2");
    			h2.textContent = "Car Editor";
    			t15 = space();
    			create_component(carform.$$.fragment);
    			t16 = space();
    			p2 = element("p");
    			p2.textContent = "The \"Save Changes\" button doesn't actually do anything, it's just a demo of how\n\tyou are able to disable saving if no changes are made. Try editing\n\tsome fields, then changing them back to what they were, to see the\n\tbutton enable and then disable.";
    			t18 = space();
    			button1 = element("button");
    			t19 = text("Save Changes");
    			t20 = space();
    			hr2 = element("hr");
    			t21 = space();
    			p3 = element("p");
    			p3.innerHTML = `Here you can see what the <code>form</code> object looks like, as you modify it.`;
    			t25 = space();
    			pre = element("pre");
    			t26 = text(t26_value);
    			button1.disabled = button1_disabled_value = !/*hasChanges*/ ctx[1];
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			insert(target, p0, anchor);
    			insert(target, t7, anchor);
    			insert(target, hr0, anchor);
    			insert(target, t8, anchor);
    			insert(target, p1, anchor);
    			insert(target, t10, anchor);
    			insert(target, button0, anchor);
    			insert(target, t12, anchor);
    			insert(target, hr1, anchor);
    			insert(target, t13, anchor);
    			insert(target, h2, anchor);
    			insert(target, t15, anchor);
    			mount_component(carform, target, anchor);
    			insert(target, t16, anchor);
    			insert(target, p2, anchor);
    			insert(target, t18, anchor);
    			insert(target, button1, anchor);
    			append(button1, t19);
    			insert(target, t20, anchor);
    			insert(target, hr2, anchor);
    			insert(target, t21, anchor);
    			insert(target, p3, anchor);
    			insert(target, t25, anchor);
    			insert(target, pre, anchor);
    			append(pre, t26);
    			current = true;

    			if (!mounted) {
    				dispose = listen(button0, "click", /*loadCar*/ ctx[3]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			const carform_changes = {};
    			if (dirty & /*form*/ 1) carform_changes.form = /*form*/ ctx[0];
    			carform.$set(carform_changes);

    			if (!current || dirty & /*hasChanges*/ 2 && button1_disabled_value !== (button1_disabled_value = !/*hasChanges*/ ctx[1])) {
    				button1.disabled = button1_disabled_value;
    			}

    			if ((!current || dirty & /*form*/ 1) && t26_value !== (t26_value = JSON.stringify(/*form*/ ctx[0], undefined, 4) + "")) set_data(t26, t26_value);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(carform.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(carform.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(h1);
    			if (detaching) detach(t1);
    			if (detaching) detach(p0);
    			if (detaching) detach(t7);
    			if (detaching) detach(hr0);
    			if (detaching) detach(t8);
    			if (detaching) detach(p1);
    			if (detaching) detach(t10);
    			if (detaching) detach(button0);
    			if (detaching) detach(t12);
    			if (detaching) detach(hr1);
    			if (detaching) detach(t13);
    			if (detaching) detach(h2);
    			if (detaching) detach(t15);
    			destroy_component(carform, detaching);
    			if (detaching) detach(t16);
    			if (detaching) detach(p2);
    			if (detaching) detach(t18);
    			if (detaching) detach(button1);
    			if (detaching) detach(t20);
    			if (detaching) detach(hr2);
    			if (detaching) detach(t21);
    			if (detaching) detach(p3);
    			if (detaching) detach(t25);
    			if (detaching) detach(pre);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    let readonly = false;

    function instance($$self, $$props, $$invalidate) {
    	let hasChanges;

    	let form = {
    		data: {},
    		original: {},
    		errors: {},
    		changes: {}
    	};

    	/** @type {import('..').createResource} */
    	const create = resourceCreator();

    	// Here we simulate loading from an API that gives back a
    	// normal JSON:API response object. We need to transform
    	// that into the `JsonApiForm` object structure.
    	const loadCar = () => fetchCarFromApi().then(response => {
    		$$invalidate(0, form = formFromResponse(response));
    	});

    	const formChange_handler = event => $$invalidate(0, form = onFormChange(form, event));
    	const createResource_handler = event => $$invalidate(0, form = create(form, event));
    	const removeResource_handler = event => $$invalidate(0, form = removeResource(form, event));

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*form*/ 1) {
    			/**
     * Here we are demonstrating one of the ways to reactively update the display based on
     * whether there are any changes between the original and current form. This is typically
     * used to, e.g., leave a "Save Changes" button disabled until there are actual changes.
     * @type boolean
     */
    			$$invalidate(1, hasChanges = Object.keys(form.changes || {}).length);
    		}
    	};

    	return [
    		form,
    		hasChanges,
    		create,
    		loadCar,
    		formChange_handler,
    		createResource_handler,
    		removeResource_handler
    	];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, {});
    	}
    }

    new App({
    	target: document.getElementById('app')
    });

})();
