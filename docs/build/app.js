(function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
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
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
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
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
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

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
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

    var justDiff = {
      diff: diff,
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

    function diff(obj1, obj2, pathConverter) {
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

    /* src/Form.svelte generated by Svelte v3.43.0 */
    const get_default_slot_changes$1 = dirty => ({ errors: dirty & /*errors*/ 1 });

    const get_default_slot_context$1 = ctx => ({
    	create: /*create*/ ctx[2],
    	remove: /*remove*/ ctx[1],
    	errors: /*errors*/ ctx[0]
    });

    function create_fragment$4(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[8].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[7], get_default_slot_context$1);

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope, errors*/ 129)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[7],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[7])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[7], dirty, get_default_slot_changes$1),
    						get_default_slot_context$1
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let errors;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	const { diff } = justDiff;
    	let { form } = $$props;
    	let { startingCount = 0 } = $$props;
    	let { prefix = 'GID' } = $$props;
    	let { suffix = '' } = $$props;
    	let count = startingCount;

    	const makeDiff = (form, id) => {
    		form.changes[id] = diff(form.original[id] || {}, form.data[id] || {});
    		if (!form.changes[id].length) delete form.changes[id];
    		if (Object.keys(form.changes).length) form.state = 'unsaved'; else form.state = 'unchanged';
    	};

    	const dispatch = createEventDispatcher();

    	const remove = ({ id, type }) => {
    		delete form.data[id];
    		makeDiff(form, id);

    		for (let resourceId in form.data) {
    			let touched;
    			let resource = form.data[resourceId];

    			for (let relName of Object.keys(resource.relationships || {})) {
    				const rel = resource.relationships[relName];

    				if (Array.isArray(rel.data)) {
    					let filtered = rel.data.filter(r => r.id !== id || r.type !== type);

    					if (filtered.length !== rel.data.length) {
    						$$invalidate(3, form.data[resourceId].relationships[relName].data = filtered, form);
    						if (!rel.data.length) delete form.data[resourceId].relationships[relName].data;
    						touched = true;
    					}
    				} else if (rel?.data?.id === id && rel?.data?.type === type) {
    					delete form.data[resourceId].relationships[relName].data;
    					touched = true;
    				}

    				if (!rel.data) {
    					delete form.data[resourceId].relationships[relName];
    					touched = true;
    				}
    			}

    			if (!Object.keys(resource.relationships || {}).length) {
    				delete form.data[resourceId].relationships;
    				touched = true;
    			}

    			if (touched) makeDiff(form, resourceId);
    		}

    		dispatch('remove', { id, type });
    	};

    	const create = ({ relId, relName, isArray, type }) => {
    		let id = `${prefix}${++count}${suffix}`;
    		$$invalidate(3, form.data[id] = { type, id }, form);
    		makeDiff(form, id);
    		if (!form.data[relId].relationships) $$invalidate(3, form.data[relId].relationships = {}, form);
    		if (!form.data[relId].relationships[relName]) $$invalidate(3, form.data[relId].relationships[relName] = {}, form);

    		if (isArray) {
    			let data = form.data[relId].relationships[relName].data || [];
    			data.push({ type, id });
    			$$invalidate(3, form.data[relId].relationships[relName].data = data, form);
    		} else {
    			$$invalidate(3, form.data[relId].relationships[relName].date = { type, id }, form);
    		}

    		makeDiff(form, relId);
    		dispatch('create', { relId, relName, isArray, type });
    	};

    	$$self.$$set = $$props => {
    		if ('form' in $$props) $$invalidate(3, form = $$props.form);
    		if ('startingCount' in $$props) $$invalidate(4, startingCount = $$props.startingCount);
    		if ('prefix' in $$props) $$invalidate(5, prefix = $$props.prefix);
    		if ('suffix' in $$props) $$invalidate(6, suffix = $$props.suffix);
    		if ('$$scope' in $$props) $$invalidate(7, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*form*/ 8) {
    			$$invalidate(0, errors = form?.errors?.other || []);
    		}
    	};

    	return [errors, remove, create, form, startingCount, prefix, suffix, $$scope, slots];
    }

    class Form extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			form: 3,
    			startingCount: 4,
    			prefix: 5,
    			suffix: 6
    		});
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

    var justDebounceIt = debounce;

    function debounce(fn, wait, callFirst) {
      var timeout = null;
      var debouncedFn = null;

      var clear = function() {
        if (timeout) {
          clearTimeout(timeout);

          debouncedFn = null;
          timeout = null;
        }
      };

      var flush = function() {
        var call = debouncedFn;
        clear();

        if (call) {
          call();
        }
      };

      var debounceWrapper = function() {
        if (!wait) {
          return fn.apply(this, arguments);
        }

        var context = this;
        var args = arguments;
        var callNow = callFirst && !timeout;
        clear();

        debouncedFn = function() {
          fn.apply(context, args);
        };

        timeout = setTimeout(function() {
          timeout = null;

          if (!callNow) {
            var call = debouncedFn;
            debouncedFn = null;

            return call();
          }
        }, wait);

        if (callNow) {
          return debouncedFn();
        }
      };

      debounceWrapper.cancel = clear;
      debounceWrapper.flush = flush;

      return debounceWrapper;
    }

    /* src/Field.svelte generated by Svelte v3.43.0 */

    const get_default_slot_changes = dirty => ({
    	value: dirty & /*value*/ 4,
    	errors: dirty & /*errors*/ 2
    });

    const get_default_slot_context = ctx => ({
    	value: /*value*/ ctx[2],
    	set: /*set*/ ctx[0],
    	errors: /*errors*/ ctx[1]
    });

    function create_fragment$3(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[9].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], get_default_slot_context);

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope, value, errors*/ 262)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[8],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[8])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[8], dirty, get_default_slot_changes),
    						get_default_slot_context
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let tokens;
    	let value;
    	let errors;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	const { diff } = justDiff;
    	let { form } = $$props;
    	let { id } = $$props;
    	let { keypath } = $$props;
    	let { debounceMillis } = $$props;

    	/*
    Because the diff calculation is expensive, we debounce so that e.g. entering text
    rapidly won't cause a sudden pile of blocking diff calculations to slow the UI.
     */
    	const dispatch = createEventDispatcher();

    	const change = justDebounceIt(
    		updatedValue => {
    			$$invalidate(3, form.changes[id] = diff(form.original[id] || {}, form.data[id] || {}), form);
    			if (!form.changes[id].length) delete form.changes[id];
    			if (Object.keys(form.changes).length) $$invalidate(3, form.state = 'changed', form); else $$invalidate(3, form.state = 'unchanged', form);
    			dispatch('change', { id, keypath: tokens, value: updatedValue });
    		},
    		debounceMillis || 15,
    		true
    	);

    	const set = v => {
    		let [k1, k2, k3, k4, k5, k6] = tokens;
    		let l = tokens.length;

    		/*
    The Svelte compiler looks for reassignment as the method to detect whether a
    function inside a component is modifying a bound value. Because of this, the
    reassignment process can't use the normal shortcut found in e.g. @lukeed/dset,
    thus the following method which is limited in depth.
     */
    		l > 0 && (form.data[id][k1] ?? $$invalidate(3, form.data[id][k1] = {}, form));

    		l > 1 && (form.data[id][k1][k2] ?? $$invalidate(3, form.data[id][k1][k2] = {}, form));
    		l > 2 && (form.data[id][k1][k2][k3] ?? $$invalidate(3, form.data[id][k1][k2][k3] = {}, form));
    		l > 3 && (form.data[id][k1][k2][k3][k4] ?? $$invalidate(3, form.data[id][k1][k2][k3][k4] = {}, form));
    		l > 4 && (form.data[id][k1][k2][k3][k4][k5] ?? $$invalidate(3, form.data[id][k1][k2][k3][k4][k5] = {}, form));
    		l > 5 && (form.data[id][k1][k2][k3][k4][k5][k6] ?? $$invalidate(3, form.data[id][k1][k2][k3][k4][k5][k6] = {}, form));
    		if (l === 1) $$invalidate(3, form.data[id][k1] = v, form);
    		if (l === 2) $$invalidate(3, form.data[id][k1][k2] = v, form);
    		if (l === 3) $$invalidate(3, form.data[id][k1][k2][k3] = v, form);
    		if (l === 4) $$invalidate(3, form.data[id][k1][k2][k3][k4] = v, form);
    		if (l === 5) $$invalidate(3, form.data[id][k1][k2][k3][k4][k5] = v, form);
    		if (l === 6) $$invalidate(3, form.data[id][k1][k2][k3][k4][k5][k6] = v, form);
    		change(v);
    	};

    	$$self.$$set = $$props => {
    		if ('form' in $$props) $$invalidate(3, form = $$props.form);
    		if ('id' in $$props) $$invalidate(4, id = $$props.id);
    		if ('keypath' in $$props) $$invalidate(5, keypath = $$props.keypath);
    		if ('debounceMillis' in $$props) $$invalidate(6, debounceMillis = $$props.debounceMillis);
    		if ('$$scope' in $$props) $$invalidate(8, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*keypath*/ 32) {
    			$$invalidate(7, tokens = keypath.split ? toTokens(keypath) : keypath);
    		}

    		if ($$self.$$.dirty & /*form, id, tokens*/ 152) {
    			$$invalidate(2, value = get(form.data[id], tokens) || '');
    		}

    		if ($$self.$$.dirty & /*form, id, tokens*/ 152) {
    			$$invalidate(1, errors = get(form, ['errors', 'mapped', id, ...tokens]) || []);
    		}
    	};

    	return [set, errors, value, form, id, keypath, debounceMillis, tokens, $$scope, slots];
    }

    class Field extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			form: 3,
    			id: 4,
    			keypath: 5,
    			debounceMillis: 6,
    			set: 0
    		});
    	}

    	get set() {
    		return this.$$.ctx[0];
    	}
    }

    /* docs/Input.svelte generated by Svelte v3.43.0 */

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	return child_ctx;
    }

    // (51:1) {#each errors as error}
    function create_each_block$1(ctx) {
    	let div;
    	let strong;
    	let t0;
    	let t1_value = /*error*/ ctx[14].title + "";
    	let t1;
    	let t2;
    	let br;
    	let t3;
    	let t4_value = /*error*/ ctx[14].detail + "";
    	let t4;
    	let t5;

    	return {
    		c() {
    			div = element("div");
    			strong = element("strong");
    			t0 = text("Error: ");
    			t1 = text(t1_value);
    			t2 = space();
    			br = element("br");
    			t3 = space();
    			t4 = text(t4_value);
    			t5 = space();
    			attr(div, "class", "error");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, strong);
    			append(strong, t0);
    			append(strong, t1);
    			append(div, t2);
    			append(div, br);
    			append(div, t3);
    			append(div, t4);
    			append(div, t5);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*errors*/ 8192 && t1_value !== (t1_value = /*error*/ ctx[14].title + "")) set_data(t1, t1_value);
    			if (dirty & /*errors*/ 8192 && t4_value !== (t4_value = /*error*/ ctx[14].detail + "")) set_data(t4, t4_value);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (42:0) <Field bind:form {id} {keypath} on:change let:set let:value let:errors>
    function create_default_slot$1(ctx) {
    	let input;
    	let input_value_value;
    	let t;
    	let each_1_anchor;
    	let mounted;
    	let dispose;

    	function input_handler(...args) {
    		return /*input_handler*/ ctx[8](/*set*/ ctx[11], ...args);
    	}

    	let each_value = /*errors*/ ctx[13];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	return {
    		c() {
    			input = element("input");
    			t = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr(input, "type", /*type*/ ctx[1]);
    			input.readOnly = /*readonly*/ ctx[5];
    			input.value = input_value_value = /*value*/ ctx[12];
    			attr(input, "id", /*elementId*/ ctx[6]);
    		},
    		m(target, anchor) {
    			insert(target, input, anchor);
    			insert(target, t, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);

    			if (!mounted) {
    				dispose = [
    					listen(input, "input", input_handler),
    					listen(input, "*", /*_handler*/ ctx[7])
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*type*/ 2) {
    				attr(input, "type", /*type*/ ctx[1]);
    			}

    			if (dirty & /*readonly*/ 32) {
    				input.readOnly = /*readonly*/ ctx[5];
    			}

    			if (dirty & /*value*/ 4096 && input_value_value !== (input_value_value = /*value*/ ctx[12]) && input.value !== input_value_value) {
    				input.value = input_value_value;
    			}

    			if (dirty & /*elementId*/ 64) {
    				attr(input, "id", /*elementId*/ ctx[6]);
    			}

    			if (dirty & /*errors*/ 8192) {
    				each_value = /*errors*/ ctx[13];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(input);
    			if (detaching) detach(t);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$2(ctx) {
    	let label_1;
    	let t0;
    	let t1;
    	let field;
    	let updating_form;
    	let current;

    	function field_form_binding(value) {
    		/*field_form_binding*/ ctx[9](value);
    	}

    	let field_props = {
    		id: /*id*/ ctx[3],
    		keypath: /*keypath*/ ctx[4],
    		$$slots: {
    			default: [
    				create_default_slot$1,
    				({ set, value, errors }) => ({ 11: set, 12: value, 13: errors }),
    				({ set, value, errors }) => (set ? 2048 : 0) | (value ? 4096 : 0) | (errors ? 8192 : 0)
    			]
    		},
    		$$scope: { ctx }
    	};

    	if (/*form*/ ctx[0] !== void 0) {
    		field_props.form = /*form*/ ctx[0];
    	}

    	field = new Field({ props: field_props });
    	binding_callbacks.push(() => bind(field, 'form', field_form_binding));
    	field.$on("change", /*change_handler*/ ctx[10]);

    	return {
    		c() {
    			label_1 = element("label");
    			t0 = text(/*label*/ ctx[2]);
    			t1 = space();
    			create_component(field.$$.fragment);
    			attr(label_1, "for", /*elementId*/ ctx[6]);
    		},
    		m(target, anchor) {
    			insert(target, label_1, anchor);
    			append(label_1, t0);
    			insert(target, t1, anchor);
    			mount_component(field, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (!current || dirty & /*label*/ 4) set_data(t0, /*label*/ ctx[2]);

    			if (!current || dirty & /*elementId*/ 64) {
    				attr(label_1, "for", /*elementId*/ ctx[6]);
    			}

    			const field_changes = {};
    			if (dirty & /*id*/ 8) field_changes.id = /*id*/ ctx[3];
    			if (dirty & /*keypath*/ 16) field_changes.keypath = /*keypath*/ ctx[4];

    			if (dirty & /*$$scope, errors, type, readonly, value, elementId*/ 143458) {
    				field_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_form && dirty & /*form*/ 1) {
    				updating_form = true;
    				field_changes.form = /*form*/ ctx[0];
    				add_flush_callback(() => updating_form = false);
    			}

    			field.$set(field_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(field.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(field.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(label_1);
    			if (detaching) detach(t1);
    			destroy_component(field, detaching);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let elementId;
    	let { type = 'text' } = $$props;
    	let { label } = $$props;
    	let { form } = $$props;
    	let { id } = $$props;
    	let { keypath } = $$props;
    	let { readonly } = $$props;

    	function _handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	const input_handler = (set, event) => set(event.target.value);

    	function field_form_binding(value) {
    		form = value;
    		$$invalidate(0, form);
    	}

    	function change_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ('type' in $$props) $$invalidate(1, type = $$props.type);
    		if ('label' in $$props) $$invalidate(2, label = $$props.label);
    		if ('form' in $$props) $$invalidate(0, form = $$props.form);
    		if ('id' in $$props) $$invalidate(3, id = $$props.id);
    		if ('keypath' in $$props) $$invalidate(4, keypath = $$props.keypath);
    		if ('readonly' in $$props) $$invalidate(5, readonly = $$props.readonly);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*id, keypath*/ 24) {
    			/**
     * It is likely true that for each JSON:API resource + keypath, that you'll only have one
     * element. Therefore, an ID based on those properties is likely unique to the page. If that
     * is not true for your form, you'd need to do something extra here
     * @type string
     */
    			$$invalidate(6, elementId = [id, ...keypath.split ? keypath : keypath.join('.')].join('.'));
    		}
    	};

    	return [
    		form,
    		type,
    		label,
    		id,
    		keypath,
    		readonly,
    		elementId,
    		_handler,
    		input_handler,
    		field_form_binding,
    		change_handler
    	];
    }

    class Input extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			type: 1,
    			label: 2,
    			form: 0,
    			id: 3,
    			keypath: 4,
    			readonly: 5
    		});
    	}
    }

    /* docs/CarForm.svelte generated by Svelte v3.43.0 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[22] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[25] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[28] = list[i];
    	return child_ctx;
    }

    // (73:4) {#each (form.data[wheel.id]?.relationships?.positions?.data || []) as position}
    function create_each_block_2(ctx) {
    	let input;
    	let updating_form;
    	let t0;
    	let button;
    	let t2;
    	let br;
    	let current;
    	let mounted;
    	let dispose;

    	function input_form_binding_2(value) {
    		/*input_form_binding_2*/ ctx[10](value);
    	}

    	let input_props = {
    		label: "Position",
    		id: /*position*/ ctx[28].id,
    		keypath: ['attributes', 'position'],
    		readonly: /*readonly*/ ctx[2]
    	};

    	if (/*form*/ ctx[0] !== void 0) {
    		input_props.form = /*form*/ ctx[0];
    	}

    	input = new Input({ props: input_props });
    	binding_callbacks.push(() => bind(input, 'form', input_form_binding_2));
    	input.$on("change", /*change_handler_2*/ ctx[11]);

    	function click_handler() {
    		return /*click_handler*/ ctx[12](/*remove*/ ctx[19], /*position*/ ctx[28]);
    	}

    	return {
    		c() {
    			create_component(input.$$.fragment);
    			t0 = space();
    			button = element("button");
    			button.textContent = "Remove Position";
    			t2 = space();
    			br = element("br");
    		},
    		m(target, anchor) {
    			mount_component(input, target, anchor);
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
    			const input_changes = {};
    			if (dirty[0] & /*form, wheels*/ 9) input_changes.id = /*position*/ ctx[28].id;
    			if (dirty[0] & /*readonly*/ 4) input_changes.readonly = /*readonly*/ ctx[2];

    			if (!updating_form && dirty[0] & /*form*/ 1) {
    				updating_form = true;
    				input_changes.form = /*form*/ ctx[0];
    				add_flush_callback(() => updating_form = false);
    			}

    			input.$set(input_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(input.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(input.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(input, detaching);
    			if (detaching) detach(t0);
    			if (detaching) detach(button);
    			if (detaching) detach(t2);
    			if (detaching) detach(br);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (62:2) {#each wheels as wheel}
    function create_each_block_1(ctx) {
    	let div;
    	let input;
    	let updating_form;
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

    	function input_form_binding_1(value) {
    		/*input_form_binding_1*/ ctx[8](value);
    	}

    	let input_props = {
    		label: "Size",
    		id: /*wheel*/ ctx[25].id,
    		keypath: ['attributes', 'size'],
    		readonly: /*readonly*/ ctx[2]
    	};

    	if (/*form*/ ctx[0] !== void 0) {
    		input_props.form = /*form*/ ctx[0];
    	}

    	input = new Input({ props: input_props });
    	binding_callbacks.push(() => bind(input, 'form', input_form_binding_1));
    	input.$on("change", /*change_handler_1*/ ctx[9]);
    	let each_value_2 = /*form*/ ctx[0].data[/*wheel*/ ctx[25].id]?.relationships?.positions?.data || [];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[13](/*create*/ ctx[20], /*wheel*/ ctx[25]);
    	}

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[14](/*remove*/ ctx[19], /*wheel*/ ctx[25]);
    	}

    	return {
    		c() {
    			div = element("div");
    			create_component(input.$$.fragment);
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
    			mount_component(input, div, null);
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
    			const input_changes = {};
    			if (dirty[0] & /*wheels*/ 8) input_changes.id = /*wheel*/ ctx[25].id;
    			if (dirty[0] & /*readonly*/ 4) input_changes.readonly = /*readonly*/ ctx[2];

    			if (!updating_form && dirty[0] & /*form*/ 1) {
    				updating_form = true;
    				input_changes.form = /*form*/ ctx[0];
    				add_flush_callback(() => updating_form = false);
    			}

    			input.$set(input_changes);

    			if (dirty[0] & /*form, wheels, readonly*/ 13) {
    				each_value_2 = /*form*/ ctx[0].data[/*wheel*/ ctx[25].id]?.relationships?.positions?.data || [];
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, t2);
    					}
    				}

    				group_outros();

    				for (i = each_value_2.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(input.$$.fragment, local);

    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			transition_out(input.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(input);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (104:1) {#each errors as error}
    function create_each_block(ctx) {
    	let div;
    	let strong;
    	let t0;
    	let t1_value = /*error*/ ctx[22].title + "";
    	let t1;
    	let t2;
    	let br;
    	let t3;
    	let t4_value = /*error*/ ctx[22].detail + "";
    	let t4;
    	let t5;

    	return {
    		c() {
    			div = element("div");
    			strong = element("strong");
    			t0 = text("Unmapped Error: ");
    			t1 = text(t1_value);
    			t2 = space();
    			br = element("br");
    			t3 = space();
    			t4 = text(t4_value);
    			t5 = space();
    			attr(div, "class", "error");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, strong);
    			append(strong, t0);
    			append(strong, t1);
    			append(div, t2);
    			append(div, br);
    			append(div, t3);
    			append(div, t4);
    			append(div, t5);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*errors*/ 2097152 && t1_value !== (t1_value = /*error*/ ctx[22].title + "")) set_data(t1, t1_value);
    			if (dirty[0] & /*errors*/ 2097152 && t4_value !== (t4_value = /*error*/ ctx[22].detail + "")) set_data(t4, t4_value);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (47:0) <Form bind:form let:remove let:create let:errors on:create on:remove>
    function create_default_slot(ctx) {
    	let input;
    	let updating_form;
    	let t0;
    	let div;
    	let h3;
    	let t2;
    	let t3;
    	let button;
    	let t5;
    	let each1_anchor;
    	let current;
    	let mounted;
    	let dispose;

    	function input_form_binding(value) {
    		/*input_form_binding*/ ctx[6](value);
    	}

    	let input_props = {
    		label: "Color",
    		id: "001",
    		keypath: ['attributes', 'color'],
    		readonly: /*readonly*/ ctx[2]
    	};

    	if (/*form*/ ctx[0] !== void 0) {
    		input_props.form = /*form*/ ctx[0];
    	}

    	input = new Input({ props: input_props });
    	binding_callbacks.push(() => bind(input, 'form', input_form_binding));
    	input.$on("change", /*change_handler*/ ctx[7]);
    	let each_value_1 = /*wheels*/ ctx[3];
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks_1[i], 1, 1, () => {
    		each_blocks_1[i] = null;
    	});

    	function click_handler_3() {
    		return /*click_handler_3*/ ctx[15](/*create*/ ctx[20]);
    	}

    	let each_value = /*errors*/ ctx[21];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c() {
    			create_component(input.$$.fragment);
    			t0 = space();
    			div = element("div");
    			h3 = element("h3");
    			h3.textContent = "Wheels";
    			t2 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t3 = space();
    			button = element("button");
    			button.textContent = "Add Wheel";
    			t5 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each1_anchor = empty();
    			set_style(h3, "margin-top", "0");
    			set_style(div, "background-color", "#ddd");
    			set_style(div, "padding", "1em");
    			set_style(div, "margin", "1em");
    		},
    		m(target, anchor) {
    			mount_component(input, target, anchor);
    			insert(target, t0, anchor);
    			insert(target, div, anchor);
    			append(div, h3);
    			append(div, t2);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div, null);
    			}

    			append(div, t3);
    			append(div, button);
    			insert(target, t5, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each1_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen(button, "click", click_handler_3);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			const input_changes = {};
    			if (dirty[0] & /*readonly*/ 4) input_changes.readonly = /*readonly*/ ctx[2];

    			if (!updating_form && dirty[0] & /*form*/ 1) {
    				updating_form = true;
    				input_changes.form = /*form*/ ctx[0];
    				add_flush_callback(() => updating_form = false);
    			}

    			input.$set(input_changes);

    			if (dirty[0] & /*removeWheel, wheels, addPositionToWheel, form, readonly*/ 61) {
    				each_value_1 = /*wheels*/ ctx[3];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    						transition_in(each_blocks_1[i], 1);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						transition_in(each_blocks_1[i], 1);
    						each_blocks_1[i].m(div, t3);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks_1.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (dirty[0] & /*errors*/ 2097152) {
    				each_value = /*errors*/ ctx[21];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each1_anchor.parentNode, each1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(input.$$.fragment, local);

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			transition_out(input.$$.fragment, local);
    			each_blocks_1 = each_blocks_1.filter(Boolean);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			destroy_component(input, detaching);
    			if (detaching) detach(t0);
    			if (detaching) detach(div);
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach(t5);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each1_anchor);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	let form_1;
    	let updating_form;
    	let current;

    	function form_1_form_binding(value) {
    		/*form_1_form_binding*/ ctx[16](value);
    	}

    	let form_1_props = {
    		$$slots: {
    			default: [
    				create_default_slot,
    				({ remove, create, errors }) => ({ 19: remove, 20: create, 21: errors }),
    				({ remove, create, errors }) => [(remove ? 524288 : 0) | (create ? 1048576 : 0) | (errors ? 2097152 : 0)]
    			]
    		},
    		$$scope: { ctx }
    	};

    	if (/*form*/ ctx[0] !== void 0) {
    		form_1_props.form = /*form*/ ctx[0];
    	}

    	form_1 = new Form({ props: form_1_props });
    	binding_callbacks.push(() => bind(form_1, 'form', form_1_form_binding));
    	form_1.$on("create", /*create_handler*/ ctx[17]);
    	form_1.$on("remove", /*remove_handler*/ ctx[18]);

    	return {
    		c() {
    			create_component(form_1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(form_1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const form_1_changes = {};

    			if (dirty[0] & /*errors, carId, wheels, form, readonly*/ 2097167 | dirty[1] & /*$$scope*/ 1) {
    				form_1_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_form && dirty[0] & /*form*/ 1) {
    				updating_form = true;
    				form_1_changes.form = /*form*/ ctx[0];
    				add_flush_callback(() => updating_form = false);
    			}

    			form_1.$set(form_1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(form_1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(form_1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(form_1, detaching);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let wheels;
    	let { carId } = $$props;
    	let { form } = $$props;
    	let { readonly } = $$props;

    	// To add a resource, call the slot's `create` function. You could call it directly
    	// from your component, or if that gets unwieldy you can make a function and call
    	// it like this.
    	const addPositionToWheel = (create, wheelId) => create({
    		relId: wheelId,
    		relName: 'positions',
    		isArray: true,
    		type: 'position'
    	});

    	// If the resource you are removing has relationships, those related resources are
    	// not automatically removed, so if you know that removing them is appropriate you will
    	// need to do that by hand, like this.
    	const removeWheel = (remove, wheelId) => {
    		for (const { id, type } of form.data[wheelId]?.relationships?.positions?.data || []) {
    			remove({ id, type });
    		}

    		remove({ id: wheelId, type: 'wheel' });
    	};

    	function input_form_binding(value) {
    		form = value;
    		$$invalidate(0, form);
    	}

    	function change_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function input_form_binding_1(value) {
    		form = value;
    		$$invalidate(0, form);
    	}

    	function change_handler_1(event) {
    		bubble.call(this, $$self, event);
    	}

    	function input_form_binding_2(value) {
    		form = value;
    		$$invalidate(0, form);
    	}

    	function change_handler_2(event) {
    		bubble.call(this, $$self, event);
    	}

    	const click_handler = (remove, position) => remove(position);
    	const click_handler_1 = (create, wheel) => addPositionToWheel(create, wheel.id);
    	const click_handler_2 = (remove, wheel) => removeWheel(remove, wheel.id);

    	const click_handler_3 = create => create({
    		relId: carId,
    		relName: 'wheels',
    		isArray: true,
    		type: 'wheel'
    	});

    	function form_1_form_binding(value) {
    		form = value;
    		$$invalidate(0, form);
    	}

    	function create_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function remove_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ('carId' in $$props) $$invalidate(1, carId = $$props.carId);
    		if ('form' in $$props) $$invalidate(0, form = $$props.form);
    		if ('readonly' in $$props) $$invalidate(2, readonly = $$props.readonly);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*form, carId*/ 3) {
    			// For any related resources that we want to build components for, we will
    			// want to construct them reactively, so that adding/removing them (editing
    			// the form) will automatically update the view.
    			$$invalidate(3, wheels = form.data[carId]?.relationships?.wheels?.data || []);
    		}
    	};

    	return [
    		form,
    		carId,
    		readonly,
    		wheels,
    		addPositionToWheel,
    		removeWheel,
    		input_form_binding,
    		change_handler,
    		input_form_binding_1,
    		change_handler_1,
    		input_form_binding_2,
    		change_handler_2,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		form_1_form_binding,
    		create_handler,
    		remove_handler
    	];
    }

    class CarForm extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { carId: 1, form: 0, readonly: 2 }, null, [-1, -1]);
    	}
    }

    function klona(val) {
    	var k, out, tmp;

    	if (Array.isArray(val)) {
    		out = Array(k=val.length);
    		while (k--) out[k] = (tmp=val[k]) && typeof tmp === 'object' ? klona(tmp) : tmp;
    		return out;
    	}

    	if (Object.prototype.toString.call(val) === '[object Object]') {
    		out = {}; // null
    		for (k in val) {
    			if (k === '__proto__') {
    				Object.defineProperty(out, k, {
    					value: klona(val[k]),
    					configurable: true,
    					enumerable: true,
    					writable: true,
    				});
    			} else {
    				out[k] = (tmp=val[k]) && typeof tmp === 'object' ? klona(tmp) : tmp;
    			}
    		}
    		return out;
    	}

    	return val;
    }

    const delay = async millis => new Promise(r => setTimeout(() => r(), millis));
    const json = data => ({ json: async () => data });

    // Here we are mocking a fetch from a JSON:API compliant server, which
    // returns a JSON object in the normal structure.
    const GET = async id => delay(1200)
    	.then(() => ({
    		data: {
    			id,
    			type: 'car',
    			attributes: {
    				color: 'red'
    			},
    			relationships: {
    				wheels: {
    					data: [
    						{
    							id: `${id}w`,
    							type: 'wheel'
    						}
    					]
    				}
    			}
    		},
    		included: [
    			{
    				id: `${id}w`,
    				type: 'wheel',
    				attributes: {
    					size: 'big'
    				}
    			}
    		]
    	}))
    	.then(json);

    const mockPostWithFail = ({ included }) => {
    	// For the demo, we'll construct an array of errors, one for every object
    	// on the `mapper`, as well as one extra to see how that looks.
    	let mockResponse = {
    		errors: [
    			{
    				title: 'Unknown Error',
    				detail: 'This is an error that does not have a source pointer.'
    			},
    			{
    				title: 'Invalid Color',
    				detail: 'Whatever color you put in here is invalid.',
    				source: {
    					// If there are pointers on the errors, they're mapped
    					// to the resource by id. Since the "car" is the primary
    					// resource on the request, an API returning an error
    					// for the car color would look like this:
    					pointer: '/data/attributes/color'
    				}
    			}
    		]
    	};
    	let index = 0;
    	for (let resource of (included || [])) {
    		let propName;
    		if (resource.type === 'car') propName = 'color';
    		if (resource.type === 'wheel') propName = 'size';
    		if (resource.type === 'position') propName = 'position';
    		mockResponse.errors.push({
    			title: 'Error for a resource.',
    			detail: `There was an error for id=${resource.id}`,
    			source: {
    				pointer: `/included/${index++}/attributes/${propName}`
    			}
    		});
    	}
    	return mockResponse
    };

    const PUT = async (body, fail) => {
    	await delay(1200);
    	return json(
    		fail
    			? mockPostWithFail(body)
    			: klona(body)
    	)
    };

    /**
     * Given a normal response from a JSON:API server, create a JsonApiForm in the
     * loaded state.
     *
     * @type {import('..').load}
     */
    const load = body => {
    	body = body || {};
    	let data = {};
    	let original = {};
    	let put = resource => {
    		data[resource.id] = resource;
    		original[resource.id] = klona(resource);
    	};
    	for (let resource of (body.included || [])) put(resource);
    	if (Array.isArray(body.data)) for (let resource of body.data) put(resource);
    	else if (body.data) put(body.data);
    	return {
    		data,
    		original,
    		state: 'loaded',
    		changes: {},
    	}
    };

    /**
     * Given a JsonApiForm, create a JSON:API request with `data` and `included` (if set
     * on the form), as well as an object to map errors returned from the server.
     *
     * The mapper is needed so that the JsonApiForm, which is an id-mapped object, can
     * be connected to the JSON:API request's `included` property, which is an array.
     * The map object connects the index to the resource identifier, which is used for
     * mapping errors which contain a JSON Pointer.
     *
     * @type {import('..').saving}
     */
    const saving = ({ form, id }) => {
    	let remap = { data: id };
    	let included = [];
    	let index = 0;
    	for (let resourceId in form.data) {
    		if (resourceId !== id) {
    			included.push(form.data[resourceId]);
    			remap[index++] = resourceId;
    		}
    	}
    	let body = { data: form.data[id] };
    	if (included.length) body.included = included;
    	return { remap, body }
    };

    /**
     * After a JSON:API save request is completed, if there are no errors, this will transition
     * the form to the saved state.
     *
     * @type {import('..').saved}
     */
    const saved = body => {
    	const form = load(body);
    	form.state = 'saved';
    	return form
    };

    const add = (obj, keypath, value) => {
    	let list = get(obj, keypath) || [];
    	list.push(value);
    	set(obj, keypath, list);
    };

    /**
     * Given a JSON:API error response, combine it with a remap object to create an error
     * object which has a map of JSON Pointer paths to errors, and a list of errors that
     * are not mapped with Pointer paths.
     *
     * @type {import('..').error}
     */
    const error = ({ body, remap }) => {
    	let errors = { mapped: {}, other: [] };
    	for (let error of (body.errors || [])) {
    		let pointer = error.source?.pointer;
    		if (pointer) {
    			pointer = toTokens(pointer);
    			let [ p0, p1, ...p ] = pointer;
    			if (p0 === 'data') {
    				add(errors.mapped, [ remap.data, p1, ...p ], error);
    			} else if (p0 === 'included') {
    				add(errors.mapped, [ remap[p1], ...p ], error);
    			} else {
    				errors.other.push(error);
    			}
    		} else {
    			errors.other.push(error);
    		}
    	}
    	if (!Object.keys(errors.mapped).length) delete errors.mapped;
    	if (!errors.other.length) delete errors.other;
    	return {
    		errors,
    		state: 'error'
    	}
    };

    /**
     * When loading a resource, all you need is to pass the JSON:API response
     * to the `load` function.
     *
     * @param id
     * @return {Promise<JsonApiSvelteForm>}
     */
    const fetchCar = async ({ id }) => {
    	const response = await GET(id);
    	return load(await response.json())
    };

    /**
     * When saving a resource, you need to hold on to the `remap` property, in case
     * the JSON:API server returns an error response.
     *
     * @param {JsonApiSvelteForm} form - The modified form.
     * @param {String} id - The resource identifier.
     * @param {Boolean} [fail] - Whether the call to save should throw the mock error or not.
     * @return {Promise<JsonApiSvelteForm|ErrorDetails>}
     */
    const saveCar = async ({ form, id, fail }) => {
    	// First the form is turned into a JSON:API request, e.g. { data, included: [] }
    	// as well as a mapper to map source pointers on errors back to their original.
    	let { body, remap } = saving({ form, id });

    	// Many HTTP request implementations will throw when a request returns
    	// an error, but the MDN `fetch` specs say:
    	//   > A fetch() promise does not reject on HTTP errors
    	// If your implementation throws on errors, you'll have to modify this
    	// to use a try/catch flow.
    	const response = await PUT(body, fail);
    	const json = await response.json();

    	if (json.errors) {
    		// If there are errors in the body, we'll throw the constructed `ErrorDetails` object, using
    		// the `remap` object to connect the JSON:API index-based Pointers to the id-based ones.
    		throw error({ body: json, remap })
    	} else {
    		// If the response was a success, we need to map that response to the JsonApiForm structure. In this
    		// case there aren't any errors, so `mapper` doesn't end up getting used.
    		return saved(json)
    	}
    };

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

    	let t11_value = (!/*form*/ ctx[0].state || /*form*/ ctx[0].state === 'loading'
    	? 'Load'
    	: 'Reload') + "";

    	let t11;
    	let t12;
    	let button0_disabled_value;
    	let t13;
    	let hr1;
    	let t14;
    	let h2;
    	let t16;
    	let carform;
    	let updating_form;
    	let t17;
    	let p2;
    	let t19;
    	let p3;
    	let t20;
    	let code1;
    	let t21_value = /*form*/ ctx[0].state + "";
    	let t21;
    	let t22;
    	let button1;
    	let t23;
    	let button1_disabled_value;
    	let t24;
    	let br;
    	let t25;
    	let button2;
    	let t26;
    	let button2_disabled_value;
    	let t27;
    	let hr2;
    	let t28;
    	let p4;
    	let t34;
    	let pre0;
    	let t35_value = JSON.stringify(/*lastChange*/ ctx[1], undefined, 4) + "";
    	let t35;
    	let t36;
    	let hr3;
    	let t37;
    	let p5;
    	let t41;
    	let pre1;
    	let t42_value = JSON.stringify(/*form*/ ctx[0], undefined, 4) + "";
    	let t42;
    	let current;
    	let mounted;
    	let dispose;

    	function carform_form_binding(value) {
    		/*carform_form_binding*/ ctx[4](value);
    	}

    	let carform_props = { carId };

    	if (/*form*/ ctx[0] !== void 0) {
    		carform_props.form = /*form*/ ctx[0];
    	}

    	carform = new CarForm({ props: carform_props });
    	binding_callbacks.push(() => bind(carform, 'form', carform_form_binding));
    	carform.$on("change", /*change_handler*/ ctx[5]);
    	carform.$on("create", /*create_handler*/ ctx[6]);
    	carform.$on("remove", /*remove_handler*/ ctx[7]);

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
    			t11 = text(t11_value);
    			t12 = text(" Car");
    			t13 = space();
    			hr1 = element("hr");
    			t14 = space();
    			h2 = element("h2");
    			h2.textContent = "Car Editor";
    			t16 = space();
    			create_component(carform.$$.fragment);
    			t17 = space();
    			p2 = element("p");
    			p2.textContent = "The \"Save Changes\" button doesn't actually do anything, it's just a demo of how\n\tyou are able to disable saving if no changes are made. Try editing\n\tsome fields, then changing them back to what they were, to see the\n\tbutton enable and then disable.";
    			t19 = space();
    			p3 = element("p");
    			t20 = text("The current form state is: ");
    			code1 = element("code");
    			t21 = text(t21_value);
    			t22 = space();
    			button1 = element("button");
    			t23 = text("Save Changes (request will succeed)");
    			t24 = space();
    			br = element("br");
    			t25 = space();
    			button2 = element("button");
    			t26 = text("Save Changes (request will fail)");
    			t27 = space();
    			hr2 = element("hr");
    			t28 = space();
    			p4 = element("p");

    			p4.innerHTML = `The <code>Form</code> and <code>Field</code> components emit events, which you
	could use to drive other business logic. The demo isn&#39;t using them for anything,
	but you can see what they looks like here after you&#39;ve changed something, or
	created or removed a resource.`;

    			t34 = space();
    			pre0 = element("pre");
    			t35 = text(t35_value);
    			t36 = space();
    			hr3 = element("hr");
    			t37 = space();
    			p5 = element("p");
    			p5.innerHTML = `Here you can see what the <code>form</code> object looks like, as you modify it.`;
    			t41 = space();
    			pre1 = element("pre");
    			t42 = text(t42_value);
    			button0.disabled = button0_disabled_value = /*form*/ ctx[0].state === 'loading';
    			button1.disabled = button1_disabled_value = /*form*/ ctx[0].state !== 'changed';
    			button2.disabled = button2_disabled_value = /*form*/ ctx[0].state !== 'changed';
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
    			append(button0, t11);
    			append(button0, t12);
    			insert(target, t13, anchor);
    			insert(target, hr1, anchor);
    			insert(target, t14, anchor);
    			insert(target, h2, anchor);
    			insert(target, t16, anchor);
    			mount_component(carform, target, anchor);
    			insert(target, t17, anchor);
    			insert(target, p2, anchor);
    			insert(target, t19, anchor);
    			insert(target, p3, anchor);
    			append(p3, t20);
    			append(p3, code1);
    			append(code1, t21);
    			insert(target, t22, anchor);
    			insert(target, button1, anchor);
    			append(button1, t23);
    			insert(target, t24, anchor);
    			insert(target, br, anchor);
    			insert(target, t25, anchor);
    			insert(target, button2, anchor);
    			append(button2, t26);
    			insert(target, t27, anchor);
    			insert(target, hr2, anchor);
    			insert(target, t28, anchor);
    			insert(target, p4, anchor);
    			insert(target, t34, anchor);
    			insert(target, pre0, anchor);
    			append(pre0, t35);
    			insert(target, t36, anchor);
    			insert(target, hr3, anchor);
    			insert(target, t37, anchor);
    			insert(target, p5, anchor);
    			insert(target, t41, anchor);
    			insert(target, pre1, anchor);
    			append(pre1, t42);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(button0, "click", /*load*/ ctx[2]),
    					listen(button1, "click", /*click_handler*/ ctx[8]),
    					listen(button2, "click", /*click_handler_1*/ ctx[9])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if ((!current || dirty & /*form*/ 1) && t11_value !== (t11_value = (!/*form*/ ctx[0].state || /*form*/ ctx[0].state === 'loading'
    			? 'Load'
    			: 'Reload') + "")) set_data(t11, t11_value);

    			if (!current || dirty & /*form*/ 1 && button0_disabled_value !== (button0_disabled_value = /*form*/ ctx[0].state === 'loading')) {
    				button0.disabled = button0_disabled_value;
    			}

    			const carform_changes = {};

    			if (!updating_form && dirty & /*form*/ 1) {
    				updating_form = true;
    				carform_changes.form = /*form*/ ctx[0];
    				add_flush_callback(() => updating_form = false);
    			}

    			carform.$set(carform_changes);
    			if ((!current || dirty & /*form*/ 1) && t21_value !== (t21_value = /*form*/ ctx[0].state + "")) set_data(t21, t21_value);

    			if (!current || dirty & /*form*/ 1 && button1_disabled_value !== (button1_disabled_value = /*form*/ ctx[0].state !== 'changed')) {
    				button1.disabled = button1_disabled_value;
    			}

    			if (!current || dirty & /*form*/ 1 && button2_disabled_value !== (button2_disabled_value = /*form*/ ctx[0].state !== 'changed')) {
    				button2.disabled = button2_disabled_value;
    			}

    			if ((!current || dirty & /*lastChange*/ 2) && t35_value !== (t35_value = JSON.stringify(/*lastChange*/ ctx[1], undefined, 4) + "")) set_data(t35, t35_value);
    			if ((!current || dirty & /*form*/ 1) && t42_value !== (t42_value = JSON.stringify(/*form*/ ctx[0], undefined, 4) + "")) set_data(t42, t42_value);
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
    			if (detaching) detach(t13);
    			if (detaching) detach(hr1);
    			if (detaching) detach(t14);
    			if (detaching) detach(h2);
    			if (detaching) detach(t16);
    			destroy_component(carform, detaching);
    			if (detaching) detach(t17);
    			if (detaching) detach(p2);
    			if (detaching) detach(t19);
    			if (detaching) detach(p3);
    			if (detaching) detach(t22);
    			if (detaching) detach(button1);
    			if (detaching) detach(t24);
    			if (detaching) detach(br);
    			if (detaching) detach(t25);
    			if (detaching) detach(button2);
    			if (detaching) detach(t27);
    			if (detaching) detach(hr2);
    			if (detaching) detach(t28);
    			if (detaching) detach(p4);
    			if (detaching) detach(t34);
    			if (detaching) detach(pre0);
    			if (detaching) detach(t36);
    			if (detaching) detach(hr3);
    			if (detaching) detach(t37);
    			if (detaching) detach(p5);
    			if (detaching) detach(t41);
    			if (detaching) detach(pre1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    const carId = '001';

    function instance($$self, $$props, $$invalidate) {
    	let form = { data: {}, original: {}, changes: {} };

    	/**
     * The `Field` component emits a change event, which you could use to
     * do some other business logic, as needed. Here we're just storing it to look
     * at for the demo.
     */
    	let lastChange;

    	const load = () => {
    		$$invalidate(0, form.state = 'loading', form);
    		fetchCar({ id: carId }).then(result => $$invalidate(0, form = result));
    	};

    	const save = fail => {
    		$$invalidate(0, form.state = 'saving', form);
    		delete form.errors;

    		saveCar({ form, id: carId, fail }).then(response => $$invalidate(0, form = response)).catch(({ errors, state }) => {
    			$$invalidate(0, form.errors = errors, form);
    			$$invalidate(0, form.state = state, form);
    		});
    	};

    	function carform_form_binding(value) {
    		form = value;
    		$$invalidate(0, form);
    	}

    	const change_handler = event => $$invalidate(1, lastChange = ['change', event.detail]);
    	const create_handler = event => $$invalidate(1, lastChange = ['create', event.detail]);
    	const remove_handler = event => $$invalidate(1, lastChange = ['remove', event.detail]);
    	const click_handler = () => save(false);
    	const click_handler_1 = () => save(true);

    	return [
    		form,
    		lastChange,
    		load,
    		save,
    		carform_form_binding,
    		change_handler,
    		create_handler,
    		remove_handler,
    		click_handler,
    		click_handler_1
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
